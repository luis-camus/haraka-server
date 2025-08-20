#!/bin/bash

# Setup local DNS for mail server testing
# This script adds local domains to /etc/hosts for testing

echo "Setting up local DNS for mail server testing..."

# Check if running as root (needed to modify /etc/hosts)
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Backup current hosts file
cp /etc/hosts /etc/hosts.backup.$(date +%Y%m%d_%H%M%S)

# Add local domains
echo "" >> /etc/hosts
echo "# Local mail server testing domains" >> /etc/hosts
echo "127.0.0.1 test.local" >> /etc/hosts
echo "127.0.0.1 haraka.local" >> /etc/hosts
echo "127.0.0.1 dev.local" >> /etc/hosts
echo "127.0.0.1 mail.test.local" >> /etc/hosts
echo "127.0.0.1 smtp.test.local" >> /etc/hosts

echo "Local DNS setup complete!"
echo "Added domains: test.local, haraka.local, dev.local, mail.test.local, smtp.test.local"
echo "You can now send emails to user@test.local, user@haraka.local, etc."
echo ""
echo "To test:"
echo "  curl --url smtp://localhost:2525 \\"
echo "       --mail-from sender@test.local \\"
echo "       --mail-rcpt recipient@test.local \\"
echo "       --upload-file tests/test.txt" 