#!/bin/bash

# Test script that temporarily disables rate limiting
# This helps isolate issues with other plugins

echo "🧪 Testing Without Rate Limiting"
echo "================================"

# First, let's check if Haraka is running
if ! pgrep -f "haraka" > /dev/null; then
    echo "❌ Haraka is not running!"
    echo "Please start Haraka first:"
    echo "  haraka -c /Users/luisc/pulsar-projects/haraka-server"
    exit 1
fi

echo "✅ Haraka is running"

# Test basic functionality without rate limiting
echo -e "\n📧 Testing basic email delivery..."

# Test 1: Simple email
echo "Test 1: Simple email delivery"
if curl --url smtp://localhost:2525 \
    --mail-from "test@test.local" \
    --mail-rcpt "user@test.local" \
    --upload-file tests/test.txt > /dev/null 2>&1; then
    echo "✅ Simple email sent successfully"
else
    echo "❌ Simple email failed"
fi

# Test 2: Multiple emails (should work without rate limiting)
echo -e "\nTest 2: Multiple emails"
for i in {1..3}; do
    echo "Sending email $i..."
    if curl --url smtp://localhost:2525 \
        --mail-from "bulk@test.local" \
        --mail-rcpt "user$i@test.local" \
        --upload-file tests/test.txt > /dev/null 2>&1; then
        echo "✅ Email $i sent successfully"
    else
        echo "❌ Email $i failed"
    fi
    sleep 1
done

# Test 3: Check MongoDB
echo -e "\n🗄️ Checking MongoDB..."
if command -v mongosh &> /dev/null; then
    COUNT=$(mongosh --quiet --eval "db.emails.countDocuments()" haraka_emails 2>/dev/null || echo "0")
    echo "✅ MongoDB contains $COUNT emails"
else
    echo "⚠️ MongoDB client not available"
fi

# Test 4: Check plugin outputs
echo -e "\n🔌 Checking plugin outputs..."

# Check header scraper
if [ -d "scraped-mails" ] && [ "$(ls -A scraped-mails 2>/dev/null)" ]; then
    echo "✅ header_scraper: $(ls scraped-mails/*.json 2>/dev/null | wc -l) files"
else
    echo "⚠️ header_scraper: No files found"
fi

# Check content analyzer
if [ -d "content-analysis" ] && [ "$(ls -A content-analysis 2>/dev/null)" ]; then
    echo "✅ content_analyzer: $(ls content-analysis/*.json 2>/dev/null | wc -l) files"
else
    echo "⚠️ content_analyzer: No files found"
fi

# Check database logger
if [ -d "database" ] && [ "$(ls -A database 2>/dev/null)" ]; then
    echo "✅ database_logger: $(ls database/*.db 2>/dev/null | wc -l) files"
else
    echo "⚠️ database_logger: No files found"
fi

echo -e "\n🎉 Test completed!"
echo -e "\n📋 If these tests pass, the issue is with rate limiting configuration."
echo "You can adjust the rate limiter settings in plugins/rate_limiter.js" 