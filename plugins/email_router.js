const fs = require('fs');
const path = require('path');

// Routing rules configuration
const ROUTING_RULES = {
  // Route based on sender domain
  senderDomains: {
    'spam.com': 'spam@localhost',
    'marketing.company.com': 'marketing@localhost',
    'support.company.com': 'support@localhost'
  },
  
  // Route based on subject keywords
  subjectKeywords: {
    'urgent': 'urgent@localhost',
    'support': 'support@localhost',
    'sales': 'sales@localhost',
    'invoice': 'billing@localhost',
    'payment': 'billing@localhost'
  },
  
  // Route based on content keywords
  contentKeywords: {
    'password reset': 'security@localhost',
    'account verification': 'security@localhost',
    'order confirmation': 'orders@localhost',
    'shipping': 'logistics@localhost'
  },
  
  // Route based on attachment types
  attachmentTypes: {
    'application/pdf': 'documents@localhost',
    'image/': 'media@localhost',
    'video/': 'media@localhost'
  }
};

// Default routing
const DEFAULT_ROUTE = 'general@localhost';

exports.register = function () {
  console.log('🔧 email_router plugin registered');
  this.register_hook('data_post', 'route_email');
};

exports.route_email = function (next, connection) {
  console.log('🔧 email_router: route_email called');
  
  const txn = connection.transaction;
  if (!txn || !txn.header) {
    console.log('🔧 email_router: No transaction or headers found');
    return next();
  }

  console.log('🔧 email_router: Processing transaction');

  const headers = txn.header;
  const from = headers.get('from') || '';
  const subject = headers.get('subject') || '';
  const body = txn.body || '';

  let targetRoute = null;
  let routingReason = '';

  // Check sender domain routing
  const fromDomain = extractDomain(from);
  if (fromDomain && ROUTING_RULES.senderDomains[fromDomain]) {
    targetRoute = ROUTING_RULES.senderDomains[fromDomain];
    routingReason = `sender domain: ${fromDomain}`;
  }

  // Check subject keyword routing
  if (!targetRoute) {
    const subjectLower = subject.toLowerCase();
    for (const [keyword, route] of Object.entries(ROUTING_RULES.subjectKeywords)) {
      if (subjectLower.includes(keyword.toLowerCase())) {
        targetRoute = route;
        routingReason = `subject keyword: ${keyword}`;
        break;
      }
    }
  }

  // Check content keyword routing
  if (!targetRoute) {
    const bodyLower = body.toLowerCase();
    for (const [keyword, route] of Object.entries(ROUTING_RULES.contentKeywords)) {
      if (bodyLower.includes(keyword.toLowerCase())) {
        targetRoute = route;
        routingReason = `content keyword: ${keyword}`;
        break;
      }
    }
  }

  // Check attachment type routing
  if (!targetRoute && txn.attachment_hooks && txn.attachment_hooks.length > 0) {
    for (const attachment of txn.attachment_hooks) {
      const contentType = attachment.content_type || '';
      for (const [typePattern, route] of Object.entries(ROUTING_RULES.attachmentTypes)) {
        if (contentType.startsWith(typePattern)) {
          targetRoute = route;
          routingReason = `attachment type: ${contentType}`;
          break;
        }
      }
      if (targetRoute) break;
    }
  }

  // Use default route if no specific routing found
  if (!targetRoute) {
    targetRoute = DEFAULT_ROUTE;
    routingReason = 'default route';
  }

  // Log routing decision
  connection.loginfo(this, `Email routed to ${targetRoute} (${routingReason})`);

  // Save routing information
  const routingInfo = {
    timestamp: new Date().toISOString(),
    originalTo: headers.get('to'),
    routedTo: targetRoute,
    reason: routingReason,
    from: from,
    subject: subject,
    hasAttachments: txn.attachment_hooks && txn.attachment_hooks.length > 0,
    attachmentCount: txn.attachment_hooks ? txn.attachment_hooks.length : 0
  };

  // Save routing log
  const outputDir = path.resolve(__dirname, '../routing-logs');
  console.log('🔧 email_router: Creating directory:', outputDir);
  
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log('🔧 email_router: Directory created successfully');
    }

    const fileName = `routing-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.json`;
    const outputPath = path.join(outputDir, fileName);
    console.log('🔧 email_router: Writing to:', outputPath);

    fs.writeFile(outputPath, JSON.stringify(routingInfo, null, 2), (err) => {
      if (err) {
        console.error('🔧 email_router: Write error:', err.message);
        connection.logerror(this, `Failed to write routing log: ${err.message}`);
      } else {
        console.log('🔧 email_router: File written successfully');
        connection.loginfo(this, `Saved routing log to ${outputPath}`);
      }
    });
  } catch (error) {
    console.error('🔧 email_router: Error creating directory or file:', error.message);
    connection.logerror(this, `Email router error: ${error.message}`);
  }

  // In a real implementation, you would modify the transaction to forward to the target route
  // For now, we'll just log the decision
  connection.loginfo(this, `Would forward email to: ${targetRoute}`);

  return next();
};

function extractDomain(email) {
  const match = email.match(/@([^>]+)/);
  return match ? match[1].toLowerCase() : null;
} 