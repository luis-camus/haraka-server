# 🎓 Haraka Learning Guide

Welcome to your Haraka learning journey! This guide will help you understand Haraka's architecture and implement various plugins to explore its capabilities.

## 📚 Understanding Haraka Architecture

### Core Concepts

1. **Plugins**: Haraka uses a plugin-based architecture where each plugin can hook into different stages of email processing
2. **Hooks**: Points in the email processing pipeline where plugins can intercept and modify emails
3. **Transactions**: Each email creates a transaction object containing headers, body, and metadata
4. **Connections**: Represents the SMTP connection from the client

### Key Hooks You Can Use

- `connect`: When a client connects
- `helo`: When client sends HELO/EHLO
- `auth`: During authentication
- `mail_from`: When sender is specified
- `rcpt_to`: When recipient is specified
- `data`: When email data starts
- `data_post`: After email data is complete
- `queue`: When email is queued for delivery
- `queue_outbound`: When email is sent outbound

## 🚀 Learning Projects

### Project 1: Content Analyzer Plugin

**What it does**: Analyzes email content for spam indicators, extracts keywords, and provides insights.

**Learning objectives**:
- Access email body content
- Implement basic text analysis
- Handle different content types
- Save analysis results

**To implement**:
1. Add `content_analyzer` to your `config/plugins` file
2. Restart Haraka
3. Send test emails and check the `content-analysis/` directory

### Project 2: Rate Limiting Plugin

**What it does**: Prevents abuse by limiting emails per minute/hour/day from the same IP.

**Learning objectives**:
- Track client connections by IP
- Implement time-based rate limiting
- Use the `connect` hook
- Block connections when limits are exceeded

**To implement**:
1. Add `rate_limiter` to your `config/plugins` file
2. Test by sending multiple emails quickly from the same source
3. Observe blocking behavior in logs

### Project 3: Email Router Plugin

**What it does**: Routes emails to different destinations based on content analysis.

**Learning objectives**:
- Implement conditional logic based on email content
- Extract domain information
- Create routing rules
- Log routing decisions

**To implement**:
1. Add `email_router` to your `config/plugins` file
2. Customize routing rules in the plugin
3. Send emails with different subjects/content
4. Check routing logs

### Project 4: Webhook Integration Plugin

**What it does**: Sends email data to external services via HTTP webhooks.

**Learning objectives**:
- Make HTTP requests from plugins
- Handle async operations
- Configure external integrations
- Error handling for network requests

**To implement**:
1. Add `webhook_sender` to your `config/plugins` file
2. Set up a simple webhook endpoint (e.g., using Express.js)
3. Configure the webhook URL in the plugin
4. Send emails and watch webhook calls

### Project 5: Database Logger Plugin

**What it does**: Stores email data in a database for persistent storage and analysis.

**Learning objectives**:
- Database integration
- SQL operations
- Data persistence
- Query and analysis capabilities

**To implement**:
1. Install SQLite: `npm install sqlite3`
2. Add `database_logger` to your `config/plugins` file
3. Send emails and check the database
4. Use the utility functions to query data

## 🛠️ Advanced Learning Projects

### Project 6: Attachment Processor

Create a plugin that:
- Scans attachments for viruses
- Extracts text from PDFs
- Compresses large attachments
- Logs attachment metadata

### Project 7: Authentication Plugin

Create a plugin that:
- Implements custom authentication
- Integrates with LDAP/Active Directory
- Supports OAuth2
- Logs authentication attempts

### Project 8: Email Encryption Plugin

Create a plugin that:
- Encrypts email content
- Handles PGP/GPG keys
- Decrypts incoming encrypted emails
- Manages encryption keys

### Project 9: Analytics Dashboard

Create a plugin that:
- Collects email metrics
- Exposes data via REST API
- Creates real-time dashboards
- Generates email reports

### Project 10: Machine Learning Spam Filter

Create a plugin that:
- Uses ML models for spam detection
- Trains on your email data
- Provides confidence scores
- Learns from user feedback

## 🔧 Testing Your Plugins

### 1. Basic Testing

```bash
# Send a test email
curl --url smtp://localhost:2525 \
     --mail-from sender@example.com \
     --mail-rcpt recipient@example.com \
     --upload-file tests/test.txt
```

### 2. Load Testing

```bash
# Send multiple emails quickly
for i in {1..20}; do
  curl --url smtp://localhost:2525 \
       --mail-from "sender$i@example.com" \
       --mail-rcpt "recipient$i@example.com" \
       --upload-file tests/test.txt &
done
```

### 3. Plugin Testing

```bash
# Check plugin help
haraka -h your_plugin_name

# Test specific plugin
haraka -c . -p your_plugin_name
```

## 📊 Monitoring and Debugging

### 1. Log Analysis

```bash
# Watch Haraka logs
tail -f logs/haraka.log

# Filter by plugin
grep "your_plugin_name" logs/haraka.log
```

### 2. Performance Monitoring

```bash
# Check email processing time
grep "processing time" logs/haraka.log

# Monitor memory usage
ps aux | grep haraka
```

### 3. Database Queries (if using database plugin)

```bash
# Connect to SQLite database
sqlite3 database/emails.db

# Query email statistics
SELECT COUNT(*) as total_emails FROM emails;
SELECT from_email, COUNT(*) as count FROM emails GROUP BY from_email ORDER BY count DESC LIMIT 10;
```

## 🎯 Next Steps

1. **Start with simple plugins**: Begin with the content analyzer and rate limiter
2. **Experiment with hooks**: Try different hooks to understand the email flow
3. **Add error handling**: Implement proper error handling in your plugins
4. **Optimize performance**: Monitor and optimize plugin performance
5. **Integrate with external services**: Connect to databases, APIs, and webhooks
6. **Build a complete system**: Combine multiple plugins for a comprehensive email processing system

## 📖 Resources

- [Haraka Plugin Documentation](https://haraka.github.io/manual/Plugins.html)
- [Haraka Hooks Reference](https://haraka.github.io/manual/Hooks.html)
- [Node.js Documentation](https://nodejs.org/docs/)
- [SMTP Protocol Reference](https://tools.ietf.org/html/rfc5321)

## 🤝 Contributing

Once you're comfortable with Haraka, consider:
- Contributing to the Haraka project
- Sharing your plugins with the community
- Writing documentation for your implementations
- Helping others learn Haraka

Happy learning! 🚀 