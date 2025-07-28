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

📖 Useful Haraka CLI Commands
haraka -c .                 # Start Haraka in the current directory
haraka -h <plugin-name>     # Help for a specific plugin

💡 Need More?

Let me know if you want to:
	•	Store full message body
	•	Forward emails conditionally
	•	Save to a database or trigger a webhook