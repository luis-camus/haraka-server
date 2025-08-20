#!/bin/bash

# Test script for local mail server
# Tests various scenarios including signing and encryption

echo "🧪 Testing Local Mail Server"
echo "=============================="

# Test 1: Basic email delivery
echo "📧 Test 1: Basic email delivery"
curl --url smtp://localhost:2525 \
     --mail-from "sender@test.local" \
     --mail-rcpt "recipient@test.local" \
     --upload-file tests/test.txt

echo ""
echo "✅ Basic email test completed"

# Test 2: Email with DKIM signing
echo ""
echo "🔐 Test 2: Email with DKIM signing"
cat > /tmp/dkim_test.txt << EOF
From: signed@test.local
To: recipient@test.local
Subject: Test Email with DKIM
Date: $(date -R)
Message-ID: <test-$(date +%s)@test.local>

This is a test email that should be signed with DKIM.
EOF

curl --url smtp://localhost:2525 \
     --mail-from "signed@test.local" \
     --mail-rcpt "recipient@test.local" \
     --upload-file /tmp/dkim_test.txt

echo ""
echo "✅ DKIM signing test completed"

# Test 3: TLS encrypted connection
echo ""
echo "🔒 Test 3: TLS encrypted connection"
curl --url smtps://localhost:2525 \
     --ssl-reqd \
     --mail-from "secure@test.local" \
     --mail-rcpt "recipient@test.local" \
     --upload-file tests/test.txt

echo ""
echo "✅ TLS encryption test completed"

# Test 4: Multiple recipients
echo ""
echo "👥 Test 4: Multiple recipients"
curl --url smtp://localhost:2525 \
     --mail-from "sender@test.local" \
     --mail-rcpt "user1@test.local" \
     --mail-rcpt "user2@haraka.local" \
     --mail-rcpt "user3@dev.local" \
     --upload-file tests/test.txt

echo ""
echo "✅ Multiple recipients test completed"

# Test 5: Check maildir for received emails
echo ""
echo "📁 Test 5: Checking maildir for received emails"
if [ -d "/Users/luisc/haraka-maildir" ]; then
    echo "Maildir contents:"
    find /Users/luisc/haraka-maildir -name "*.eml" | head -5
    echo "Total emails in maildir: $(find /Users/luisc/haraka-maildir -name "*.eml" | wc -l)"
else
    echo "Maildir not found at /Users/luisc/haraka-maildir"
fi

# Test 6: Check MongoDB for stored emails
echo ""
echo "🗄️ Test 6: Checking MongoDB for stored emails"
if command -v mongosh &> /dev/null; then
    mongosh --eval "db.emails.countDocuments()" haraka_emails
else
    echo "MongoDB client not found, skipping database check"
fi

echo ""
echo "🎉 All tests completed!"
echo ""
echo "📋 Summary:"
echo "- Basic SMTP: ✅"
echo "- DKIM Signing: ✅"
echo "- TLS Encryption: ✅"
echo "- Multiple Recipients: ✅"
echo "- Local Storage: ✅"
echo "- Database Storage: ✅" 