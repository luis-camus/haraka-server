const fs = require('fs');
const path = require('path');

exports.register = function () {
  console.log('🔧 content_analyzer plugin registered');
  this.register_hook('data_post', 'analyze_content');
};

exports.analyze_content = function (next, connection) {
  console.log('🔧 content_analyzer: analyze_content called');
  
  const txn = connection.transaction;
  if (!txn) {
    console.log('🔧 content_analyzer: No transaction found');
    return next();
  }

  console.log('🔧 content_analyzer: Processing transaction');

  const analysis = {
    timestamp: new Date().toISOString(),
    headers: {},
    body: {
      textLength: 0,
      htmlLength: 0,
      hasAttachments: false,
      attachmentCount: 0,
      attachmentTypes: []
    },
    analysis: {
      isSpam: false,
      spamScore: 0,
      language: 'unknown',
      sentiment: 'neutral',
      keywords: []
    }
  };

  // Analyze headers
  if (txn.header) {
    const headers = txn.header;
    analysis.headers = {
      from: headers.get('from'),
      to: headers.get('to'),
      subject: headers.get('subject'),
      contentType: headers.get('content-type'),
      contentLength: headers.get('content-length'),
      date: headers.get('date'),
      messageId: headers.get('message-id')
    };
  }

  // Analyze body content
  if (txn.body) {
    const body = txn.body;
    analysis.body.textLength = body.length;
    
    // Check for HTML content
    if (body.includes('<html') || body.includes('<body')) {
      analysis.body.htmlLength = body.length;
    }

    // Simple spam detection
    const spamKeywords = ['free', 'money', 'urgent', 'click', 'buy now', 'limited time'];
    let spamScore = 0;
    const bodyLower = body.toLowerCase();
    
    spamKeywords.forEach(keyword => {
      if (bodyLower.includes(keyword)) {
        spamScore += 1;
      }
    });

    analysis.analysis.spamScore = spamScore;
    analysis.analysis.isSpam = spamScore > 3;

    // Extract potential keywords (simple approach)
    const words = body.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const wordCount = {};
    words.forEach(word => {
      if (word.length > 4 && !['this', 'that', 'with', 'have', 'will', 'from'].includes(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
    
    analysis.analysis.keywords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  // Check for attachments
  if (txn.attachment_hooks && txn.attachment_hooks.length > 0) {
    analysis.body.hasAttachments = true;
    analysis.body.attachmentCount = txn.attachment_hooks.length;
    analysis.body.attachmentTypes = txn.attachment_hooks.map(hook => hook.content_type);
  }

  // Save analysis
  const outputDir = path.resolve(__dirname, '../content-analysis');
  console.log('🔧 content_analyzer: Creating directory:', outputDir);
  
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log('🔧 content_analyzer: Directory created successfully');
    }

    const fileName = `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.json`;
    const outputPath = path.join(outputDir, fileName);
    console.log('🔧 content_analyzer: Writing to:', outputPath);

    fs.writeFile(outputPath, JSON.stringify(analysis, null, 2), (err) => {
      if (err) {
        console.error('🔧 content_analyzer: Write error:', err.message);
        connection.logerror(this, `Failed to write content analysis: ${err.message}`);
      } else {
        console.log('🔧 content_analyzer: File written successfully');
        connection.loginfo(this, `Saved content analysis to ${outputPath}`);
      }
    });
  } catch (error) {
    console.error('🔧 content_analyzer: Error creating directory or file:', error.message);
    connection.logerror(this, `Content analyzer error: ${error.message}`);
  }

  return next();
}; 