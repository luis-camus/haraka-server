# 📬 Haraka Mail Server — Custom Setup

Welcome to your custom Haraka mail server installation!

This project is configured to accept emails, run custom plugins like `header_scraper`, and forward emails to a Python-based SMTP server for testing or development purposes.

---

## 📁 Project Structure
haraka-server/
├── config/                # Configuration files (e.g., smtp.ini, plugins)
├── plugins/               # Custom Haraka plugins (e.g., header_scraper.js)
├── scraped-mails/         # Saved JSON summaries of parsed email headers
├── smtp_server.py         # Python SMTP server (aiosmtpd-based)
├── tests/                 # Test mail files
│   └── test.txt
---

## ⚙️ Configuration

### `config/plugins`

To enable custom plugins, list them in `config/plugins`, e.g.:
header_scraper

### `plugins/header_scraper.js`

This plugin scrapes email headers and saves them into the `scraped-mails/` folder as JSON files.

---

## 🚀 How to Run the Python SMTP Server

We use a lightweight Python server via [`aiosmtpd`](https://aiosmtpd.readthedocs.io) to receive forwarded mail (e.g., from Haraka).

### ✅ Step-by-step Instructions

1. **Create a virtual environment:**

```bash
python3.13 -m venv ~/py13-venv

2.	Activate the environment:
source ~/py13-venv/bin/activate

3. Install aiosmtpd
pip install aiosmtpd

4. Run the SMTP server
python smtp_server.py

📨 Sending Test Email to Haraka
curl --url smtp://localhost:2525 \
     --mail-from sender@example.com \
     --mail-rcpt recipient@example.com \
     --upload-file tests/test.txt

This sends the message to Haraka running on port 2525.

📄 Writing Custom Plugins

To create custom plugins:
	1.	Add a .js file in the plugins/ folder.
	2.	Register a hook using this.register_hook('hook_name', 'function_name').
	3.	Enable it by adding its name to the config/plugins file.

For plugin docs:
haraka -h Plugins

## 🚀 Available Plugins

### Current Plugins
- **header_scraper**: Extracts and saves email headers as JSON
- **custom_filter**: Filters emails based on subject keywords

### New Learning Plugins
- **content_analyzer**: Analyzes email content for spam indicators and keywords
- **rate_limiter**: Implements rate limiting per IP address
- **email_router**: Routes emails based on content analysis
- **webhook_sender**: Sends email data to external webhooks
- **database_logger**: Stores email data in SQLite database
- **mongodb_logger**: Stores `from`, `to`, and body content in MongoDB

### To Enable New Plugins
Add any of the plugin names to your `config/plugins` file:
```
header_scraper
custom_filter
content_analyzer
rate_limiter
email_router
webhook_sender
database_logger
mongodb_logger
```

### Plugin Dependencies
For the database_logger plugin, install SQLite:
```bash
npm install sqlite3
```

For the mongodb_logger plugin, install MongoDB driver:
```bash
npm install mongodb
```

Environment variables (optional):
- `MONGODB_URI` (default: `mongodb://localhost:27017`)
- `MONGODB_DB` (default: `haraka_emails`)
- `MONGODB_COLLECTION` (default: `emails`)

📖 Useful Haraka CLI Commands
haraka -c .                 # Start Haraka in the current directory
haraka -h <plugin-name>     # Help for a specific plugin

## 🧪 Testing Your Plugins

Use the included test suite to test all plugins:

```bash
# Run all tests
node test_plugins.js

# Run only rate limit test
node test_plugins.js --rate-limit-only

# Check plugin outputs
node test_plugins.js --check-outputs

# Show help
node test_plugins.js --help
```

## 📚 Learning Resources

- **LEARNING_GUIDE.md**: Comprehensive guide to understanding Haraka and implementing plugins
- **Haraka Documentation**: https://haraka.github.io/
- **Plugin Examples**: Check the `plugins/` directory for working examples

## 🎯 Next Steps

1. **Start with simple plugins**: Enable `content_analyzer` and `rate_limiter` first
2. **Experiment with configuration**: Modify plugin settings to see different behaviors
3. **Build your own plugins**: Use the examples as templates for your own ideas
4. **Integrate with external services**: Set up webhooks, databases, or APIs
5. **Monitor and optimize**: Use the test suite to measure performance

💡 **Need More Ideas?**

- **Machine Learning**: Train spam detection models on your email data
- **Analytics Dashboard**: Create a web interface to view email statistics
- **Email Encryption**: Implement PGP/GPG encryption/decryption
- **Attachment Processing**: Scan, compress, or extract content from attachments
- **Multi-tenant Support**: Route emails for different domains/organizations



