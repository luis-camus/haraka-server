const fs = require('fs');
const path = require('path');

// TLS configuration
const TLS_CONFIG = {
  enabled: process.env.TLS_ENABLED === 'true' || false,
  certPath: process.env.TLS_CERT_PATH || null,
  keyPath: process.env.TLS_KEY_PATH || null,
  caPath: process.env.TLS_CA_PATH || null,
  requireTLS: process.env.TLS_REQUIRE === 'true' || false
};

let tlsOptions = null;

exports.register = function () {
  const plugin = this;
  plugin.loginfo(plugin, 'tls_manager plugin registered');
  
  // Register hooks for TLS handling
  this.register_hook('capabilities', 'advertise_tls');
  this.register_hook('unrecognized_command', 'handle_starttls');
  
  // Initialize TLS certificates
  initializeTLS(plugin);
};

function initializeTLS(plugin) {
  if (!TLS_CONFIG.enabled) {
    plugin.loginfo(plugin, 'TLS disabled');
    return;
  }
  
  try {
    // Try to load certificates
    if (TLS_CONFIG.certPath && TLS_CONFIG.keyPath) {
      tlsOptions = {
        cert: fs.readFileSync(TLS_CONFIG.certPath),
        key: fs.readFileSync(TLS_CONFIG.keyPath),
        ca: TLS_CONFIG.caPath ? fs.readFileSync(TLS_CONFIG.caPath) : undefined
      };
      plugin.loginfo(plugin, 'TLS certificates loaded successfully');
    } else {
      // Generate self-signed certificate for development
      generateSelfSignedCert(plugin);
    }
  } catch (err) {
    plugin.logerror(plugin, `TLS initialization failed: ${err.message}`);
    generateSelfSignedCert(plugin);
  }
}

function generateSelfSignedCert(plugin) {
  try {
    const { execSync } = require('child_process');
    const certDir = path.join(__dirname, '..', 'certs');
    
    // Create certs directory if it doesn't exist
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }
    
    const certPath = path.join(certDir, 'server.crt');
    const keyPath = path.join(certDir, 'server.key');
    
    // Generate self-signed certificate
    const cmd = `openssl req -x509 -newkey rsa:2048 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=test.local"`;
    execSync(cmd, { stdio: 'pipe' });
    
    tlsOptions = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    };
    
    plugin.loginfo(plugin, 'Generated self-signed TLS certificate for development');
    plugin.loginfo(plugin, `Certificate: ${certPath}`);
    plugin.loginfo(plugin, `Private key: ${keyPath}`);
  } catch (err) {
    plugin.logerror(plugin, `Failed to generate self-signed certificate: ${err.message}`);
  }
}

exports.advertise_tls = function (next, connection) {
  const plugin = this;
  
  if (!TLS_CONFIG.enabled || !tlsOptions) {
    return next();
  }
  
  // Advertise STARTTLS capability
  connection.capabilities.push('STARTTLS');
  next();
};

exports.handle_starttls = function (next, connection, command) {
  const plugin = this;
  
  if (command.toUpperCase() !== 'STARTTLS') {
    return next();
  }
  
  if (!TLS_CONFIG.enabled || !tlsOptions) {
    connection.respond(454, 'TLS not available');
    return next();
  }
  
  // Respond with 220 to indicate ready for TLS
  connection.respond(220, 'Ready to start TLS');
  
  // Upgrade connection to TLS
  const tls = require('tls');
  const tlsSocket = tls.connect({
    socket: connection.client,
    ...tlsOptions,
    rejectUnauthorized: false // For development
  });
  
  tlsSocket.on('secure', () => {
    connection.client = tlsSocket;
    connection.using_tls = true;
    plugin.loginfo(plugin, 'TLS connection established');
  });
  
  tlsSocket.on('error', (err) => {
    plugin.logerror(plugin, `TLS error: ${err.message}`);
    connection.respond(454, 'TLS negotiation failed');
  });
  
  next();
}; 