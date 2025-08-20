'use strict';

const { MongoClient } = require('mongodb');
const { randomUUID } = require('crypto');

// --- Basic MongoDB configuration; can be overridden via environment variables
const MONGO_CONFIG = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  dbName: process.env.MONGODB_DB || 'haraka_emails',
  collectionName: process.env.MONGODB_COLLECTION || 'emails',
};

// --- Batching configuration (for write-to-Mongo batching only)
const BATCH_CONFIG = {
  maxBatchSize: 100,
  maxBatchTimeMs: 2 * 60 * 1000, // 2 minutes
};

// --- State
let mongoClient = null;
let mongoCollection = null;
let batchQueue = [];
let batchTimer = null;
let isFlushing = false;
let RUNTIME_CFG = { hold_only: false };

// ------------------------------------------------------------
// Haraka entry point
// ------------------------------------------------------------
exports.register = function register () {
  const plugin = this;

  // Hot-reloadable config
  plugin.load_cfg = function load_cfg () {
    const cfg = plugin.config.get(
      'mongodb_logger.ini',
      { booleans: ['+main.hold_only'] },
      () => plugin.load_cfg() // hot reload on file changes
    );
    RUNTIME_CFG.hold_only = !!(cfg.main && cfg.main.hold_only);
    plugin.loginfo(plugin, `mongodb_logger: hold_only=${RUNTIME_CFG.hold_only}`);
  };
  plugin.load_cfg();

  plugin.loginfo(plugin, 'mongodb_logger plugin registered');

  // Always capture mail into Mongo for visibility/forensics
  plugin.register_hook('data_post', 'save_to_mongodb');

  // Intercept the queue step; when hold_only=true we ACK here to prevent outbound
  plugin.register_hook('queue', 'hold_and_ack');

  initializeMongo(plugin)
    .then(() => plugin.loginfo(plugin, 'MongoDB initialized successfully'))
    .catch((err) => {
      plugin.logerror(plugin, `MongoDB initialization failed: ${err && err.message ? err.message : err}`);
    });
};

// ------------------------------------------------------------
// Mongo init
// ------------------------------------------------------------
async function initializeMongo (plugin) {
  if (mongoCollection) return;

  mongoClient = new MongoClient(MONGO_CONFIG.uri, {
    serverSelectionTimeoutMS: 3000,
  });

  await mongoClient.connect();
  const db = mongoClient.db(MONGO_CONFIG.dbName);
  mongoCollection = db.collection(MONGO_CONFIG.collectionName);

  try {
    await mongoCollection.createIndex({ receivedAt: -1 });
    await mongoCollection.createIndex({ status: 1, receivedAt: -1 });
  } catch (e) {
    plugin.logerror(plugin, `Index creation failed: ${e && e.message ? e.message : e}`);
  }
}

// ------------------------------------------------------------
// Batch flush (to Mongo) — unchanged semantics
// ------------------------------------------------------------
async function flushBatch (plugin) {
  if (isFlushing || batchQueue.length === 0) return;

  isFlushing = true;
  const batchToSend = [...batchQueue];
  batchQueue = [];

  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }

  try {
    if (batchToSend.length > 0) {
      await mongoCollection.insertMany(batchToSend);
      plugin.loginfo(plugin, `Batch flushed: ${batchToSend.length} emails stored in MongoDB`);
    }
  } catch (err) {
    plugin.logerror(plugin, `Failed to flush batch to MongoDB: ${err && err.message ? err.message : err}`);
    // Re-queue for retry
    batchQueue.unshift(...batchToSend);
  } finally {
    isFlushing = false;
    if (batchQueue.length > 0) scheduleBatchFlush(plugin);
  }
}

function scheduleBatchFlush (plugin) {
  if (batchTimer) return;
  batchTimer = setTimeout(() => flushBatch(plugin), BATCH_CONFIG.maxBatchTimeMs);
}

// ------------------------------------------------------------
// Capture mail after DATA — store to Mongo (batched)
// Adds a status flag so held mail is easy to query.
// ------------------------------------------------------------
exports.save_to_mongodb = function save_to_mongodb (next, connection) {
  const plugin = this;

  if (!mongoCollection) return next(); // don’t block mail flow

  const txn = connection.transaction;
  if (!txn) return next();

  const headers = txn.header;
  const fromHeader = headers && headers.get ? headers.get('from') : null;
  const toHeader   = headers && headers.get ? headers.get('to')   : null;
  const bodyContent = txn.body || '';

  const doc = {
    messageId: txn.uuid || randomUUID(),
    from: fromHeader || txn.mail_from?.address() || null,
    to: toHeader || (txn.rcpt_to || []).map(r => r.address()),
    body: bodyContent,
    receivedAt: new Date(),
    // Helpful markers
    status: RUNTIME_CFG.hold_only ? 'held' : 'logged',
    mode: RUNTIME_CFG.hold_only ? 'held' : 'pass_through',
  };

  // Add to in-memory batch for insertMany
  batchQueue.push(doc);

  if (batchQueue.length === 1) scheduleBatchFlush(plugin);
  if (batchQueue.length >= BATCH_CONFIG.maxBatchSize) flushBatch(plugin);

  // Proceed with pipeline immediately
  next();
};

// ------------------------------------------------------------
// Queue hook — prevents outbound when hold_only=true
// Returning OK here means "we handled queueing," so queue/outbound won’t run.
// ------------------------------------------------------------
exports.hold_and_ack = async function hold_and_ack (next, connection) {
  const plugin = this;

  if (!RUNTIME_CFG.hold_only) {
    // Normal behavior: let Haraka queue/outbound send the message
    return next();
  }

  // hold_only=true → accept and do NOT send
  // Optionally, we could upsert extra flags here; save_to_mongodb already wrote a doc.
  try {
    if (mongoCollection && connection?.transaction?.uuid) {
      await mongoCollection.updateOne(
        { messageId: connection.transaction.uuid },
        { $set: { status: 'held', heldAt: new Date(), mode: 'held' } },
        { upsert: false }
      );
    }
  } catch (e) {
    plugin.logerror(plugin, `Failed to mark as held: ${e && e.message ? e.message : e}`);
    // even if marking failed, we still prevent sending
  }

  plugin.loginfo(plugin, 'hold_only enabled — message accepted and stored; not forwarding to outbound');
  return next(OK);
};

// ------------------------------------------------------------
// Graceful shutdown — flush remaining inserts, close Mongo
// ------------------------------------------------------------
exports.shutdown = function shutdown (next) {
  const plugin = this;

  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }

  const finalize = () => {
    if (mongoClient) mongoClient.close().catch(() => {});
    next();
  };

  if (batchQueue.length > 0) {
    plugin.loginfo(plugin, `Shutting down: flushing ${batchQueue.length} remaining emails`);
    flushBatch(plugin).then(finalize).catch((err) => {
      plugin.logerror(plugin, `Error during shutdown flush: ${err && err.message ? err.message : err}`);
      finalize();
    });
  } else {
    finalize();
  }
};