const { MongoClient } = require('mongodb');

// Basic MongoDB configuration; can be overridden via environment variables
const MONGO_CONFIG = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  dbName: process.env.MONGODB_DB || 'haraka_emails',
  collectionName: process.env.MONGODB_COLLECTION || 'emails'
};

let mongoClient = null;
let mongoCollection = null;

exports.register = function () {
  const plugin = this;
  plugin.loginfo(plugin, 'mongodb_logger plugin registered');
  this.register_hook('data_post', 'save_to_mongodb');

  initializeMongo(plugin)
    .then(() => {
      plugin.loginfo(plugin, 'MongoDB initialized successfully');
    })
    .catch((err) => {
      plugin.logerror(plugin, `MongoDB initialization failed: ${err && err.message ? err.message : err}`);
    });
};

async function initializeMongo(plugin) {
  if (mongoCollection) return;

  mongoClient = new MongoClient(MONGO_CONFIG.uri, {
    serverSelectionTimeoutMS: 3000
  });

  await mongoClient.connect();
  const db = mongoClient.db(MONGO_CONFIG.dbName);
  mongoCollection = db.collection(MONGO_CONFIG.collectionName);

  // Helpful index for time-based queries
  try {
    await mongoCollection.createIndex({ receivedAt: -1 });
  } catch (e) {
    plugin.logerror(plugin, `Index creation failed: ${e && e.message ? e.message : e}`);
  }
}

exports.save_to_mongodb = function (next, connection) {
  const plugin = this;

  if (!mongoCollection) {
    // Mongo not initialized; proceed without blocking mail flow
    return next();
  }

  const transaction = connection.transaction;
  if (!transaction) return next();

  const headers = transaction.header;
  const fromHeader = headers && headers.get ? headers.get('from') : null;
  const toHeader = headers && headers.get ? headers.get('to') : null;
  const bodyContent = transaction.body || '';

  const emailDocument = {
    from: fromHeader || null,
    to: toHeader || null,
    body: bodyContent,
    receivedAt: new Date(),
    remoteIp: connection.remote_ip || null
  };

  mongoCollection
    .insertOne(emailDocument)
    .then((result) => {
      connection.loginfo(plugin, `Stored email in MongoDB with _id: ${result.insertedId}`);
      next();
    })
    .catch((err) => {
      connection.logerror(plugin, `Failed to store email in MongoDB: ${err && err.message ? err.message : err}`);
      next();
    });
};

