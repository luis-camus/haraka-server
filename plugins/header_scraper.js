const fs = require('fs');
const path = require('path');

exports.register = function () {
  this.register_hook('data_post', 'scrape_headers');
};

exports.scrape_headers = function (next, connection) {
  const txn = connection.transaction;
  if (!txn || !txn.header) return next();

  const headers = txn.header;

  // Extract example fields
  const from = headers.get('from');
  const to = headers.get('to');
  const subject = headers.get('subject');
  const messageId = headers.get('message-id');
  const userAgent = headers.get('user-agent');
  const xMailer = headers.get('x-mailer');
  const originatingIP = headers.get('x-originating-ip');

  const summary = {
    timestamp: new Date().toISOString(),
    from,
    to,
    subject,
    messageId,
    userAgent,
    xMailer,
    originatingIP,
    allHeaders: headers.headers_decoded
  };

  // Save as JSON file
  const outputDir = path.resolve(__dirname, '../scraped-mails');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.json`;
  const outputPath = path.join(outputDir, fileName);

  fs.writeFile(outputPath, JSON.stringify(summary, null, 2), (err) => {
    if (err) {
      connection.logerror(this, `Failed to write header summary: ${err.message}`);
    } else {
      connection.loginfo(this, `Saved header summary to ${outputPath}`);
    }
  });

  return next();
};