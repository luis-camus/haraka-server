const https = require('https');
const http = require('http');
const url = require('url');

// Webhook configuration
const WEBHOOK_CONFIG = {
  enabled: true,
  endpoints: [
    {
      url: 'http://localhost:3000/webhook/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Haraka-Plugin': 'webhook_sender'
      },
      timeout: 5000, // 5 seconds
      retries: 3
    }
  ],
  
  // What data to send
  sendHeaders: true,
  sendBody: false, // Set to true if you want to send email body
  sendAttachments: false,
  sendMetadata: true
};

exports.register = function () {
  this.register_hook('data_post', 'send_webhook');
};

exports.send_webhook = function (next, connection) {
  const txn = connection.transaction;
  if (!txn || !WEBHOOK_CONFIG.enabled) return next();

  // Prepare webhook data
  const webhookData = {
    timestamp: new Date().toISOString(),
    messageId: txn.header.get('message-id'),
    from: txn.header.get('from'),
    to: txn.header.get('to'),
    subject: txn.header.get('subject'),
    date: txn.header.get('date'),
    clientIP: connection.remote_ip,
    connectionId: connection.uuid
  };

  // Add headers if configured
  if (WEBHOOK_CONFIG.sendHeaders) {
    webhookData.headers = {};
    for (const [key, value] of txn.header.headers_decoded) {
      webhookData.headers[key] = value;
    }
  }

  // Add metadata if configured
  if (WEBHOOK_CONFIG.sendMetadata) {
    webhookData.metadata = {
      bodyLength: txn.body ? txn.body.length : 0,
      hasAttachments: txn.attachment_hooks && txn.attachment_hooks.length > 0,
      attachmentCount: txn.attachment_hooks ? txn.attachment_hooks.length : 0,
      contentType: txn.header.get('content-type'),
      userAgent: txn.header.get('user-agent'),
      xMailer: txn.header.get('x-mailer')
    };
  }

  // Add body if configured (be careful with large emails)
  if (WEBHOOK_CONFIG.sendBody && txn.body) {
    // Truncate body if too large
    const maxBodySize = 10000; // 10KB
    webhookData.body = txn.body.length > maxBodySize 
      ? txn.body.substring(0, maxBodySize) + '... [truncated]'
      : txn.body;
  }

  // Add attachment info if configured
  if (WEBHOOK_CONFIG.sendAttachments && txn.attachment_hooks) {
    webhookData.attachments = txn.attachment_hooks.map(attachment => ({
      filename: attachment.filename,
      contentType: attachment.content_type,
      size: attachment.size
    }));
  }

  // Send to all configured webhooks
  WEBHOOK_CONFIG.endpoints.forEach(endpoint => {
    sendWebhookRequest(endpoint, webhookData, connection, this);
  });

  return next();
};

function sendWebhookRequest(endpoint, data, connection, plugin) {
  const parsedUrl = url.parse(endpoint.url);
  const isHttps = parsedUrl.protocol === 'https:';
  const client = isHttps ? https : http;

  const postData = JSON.stringify(data);
  
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (isHttps ? 443 : 80),
    path: parsedUrl.path,
    method: endpoint.method || 'POST',
    headers: {
      ...endpoint.headers,
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: endpoint.timeout || 5000
  };

  const req = client.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        connection.loginfo(plugin, `Webhook sent successfully to ${endpoint.url} (${res.statusCode})`);
      } else {
        connection.logwarn(plugin, `Webhook failed for ${endpoint.url}: ${res.statusCode} - ${responseData}`);
      }
    });
  });

  req.on('error', (err) => {
    connection.logerror(plugin, `Webhook error for ${endpoint.url}: ${err.message}`);
  });

  req.on('timeout', () => {
    connection.logwarn(plugin, `Webhook timeout for ${endpoint.url}`);
    req.destroy();
  });

  req.write(postData);
  req.end();
}

// Utility function to test webhook endpoint
exports.test_webhook = function (endpointUrl, testData) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(endpointUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const postData = JSON.stringify(testData || { test: true, timestamp: new Date().toISOString() });
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };

    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          response: responseData,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(postData);
    req.end();
  });
}; 