const crypto = require('crypto');
const dns = require('dns').promises;

// DKIM configuration
const DKIM_CONFIG = {
  domain: process.env.DKIM_DOMAIN || 'test.local',
  selector: process.env.DKIM_SELECTOR || 'default',
  privateKey: process.env.DKIM_PRIVATE_KEY || null,
  algorithm: 'rsa-sha256'
};

let privateKey = null;

exports.register = function () {
  const plugin = this;
  plugin.loginfo(plugin, 'dkim_signer plugin registered');
  
  // Register hook for signing outbound emails
  this.register_hook('pre_send_trans_email', 'sign_email');
  
  // Initialize private key
  initializePrivateKey(plugin);
};

function initializePrivateKey(plugin) {
  if (DKIM_CONFIG.privateKey) {
    try {
      privateKey = DKIM_CONFIG.privateKey;
      plugin.loginfo(plugin, 'DKIM private key loaded from environment');
    } catch (err) {
      plugin.logerror(plugin, `Failed to load DKIM private key: ${err.message}`);
    }
  } else {
    // Generate a test key for development
    generateTestKey(plugin);
  }
}

function generateTestKey(plugin) {
  try {
    const { privateKey: key, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    privateKey = key;
    plugin.loginfo(plugin, 'Generated test DKIM key pair');
    plugin.loginfo(plugin, `Public key for DNS: ${publicKey.replace(/\n/g, '\\n')}`);
  } catch (err) {
    plugin.logerror(plugin, `Failed to generate test DKIM key: ${err.message}`);
  }
}

exports.sign_email = function (next, fake_connection) {
  const plugin = this;
  
  if (!privateKey) {
    plugin.logwarn(plugin, 'No DKIM private key available, skipping signature');
    return next();
  }
  
  const transaction = fake_connection.transaction;
  if (!transaction) return next();
  
  try {
    const signature = createDKIMSignature(transaction);
    if (signature) {
      transaction.header.add('DKIM-Signature', signature);
      plugin.loginfo(plugin, 'DKIM signature added to email');
    }
  } catch (err) {
    plugin.logerror(plugin, `DKIM signing failed: ${err.message}`);
  }
  
  next();
};

function createDKIMSignature(transaction) {
  const headers = transaction.header;
  const body = transaction.body || '';
  
  // Headers to sign (in order)
  const headersToSign = ['From', 'To', 'Subject', 'Date', 'Message-ID'];
  
  // Create header string
  let headerString = '';
  for (const headerName of headersToSign) {
    const headerValue = headers.get(headerName);
    if (headerValue) {
      headerString += `${headerName}: ${headerValue}\r\n`;
    }
  }
  
  // Create body hash
  const bodyHash = crypto.createHash('sha256').update(body).digest('base64');
  
  // Create signature string
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureString = [
    `v=1`,
    `a=${DKIM_CONFIG.algorithm}`,
    `c=relaxed/simple`,
    `d=${DKIM_CONFIG.domain}`,
    `s=${DKIM_CONFIG.selector}`,
    `t=${timestamp}`,
    `bh=${bodyHash}`,
    `h=${headersToSign.join(':')}`,
    `b=`
  ].join('; ');
  
  // Sign the header string
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(headerString);
  const signature = sign.sign(privateKey, 'base64');
  
  return `${signatureString}${signature}`;
} 