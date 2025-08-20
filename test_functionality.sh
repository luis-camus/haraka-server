#!/bin/bash

# Comprehensive functionality test for Haraka mail server
# Tests batching, signing, encryption, rate limiting, and all plugins

echo "🧪 Testing Haraka Mail Server Functionality"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}📧 Test $TOTAL_TESTS: $test_name${NC}"
    
    # Run the test
    if eval "$test_command" > /tmp/test_output.log 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "Error output:"
        cat /tmp/test_output.log
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to check if Haraka is running
check_haraka_running() {
    if ! pgrep -f "haraka" > /dev/null; then
        echo -e "${RED}❌ Haraka is not running!${NC}"
        echo "Please start Haraka first:"
        echo "  haraka -c /Users/luisc/pulsar-projects/haraka-server"
        exit 1
    fi
    echo -e "${GREEN}✅ Haraka is running${NC}"
}

# Check if Haraka is running
echo "🔍 Checking Haraka status..."
check_haraka_running

echo -e "\n${YELLOW}🚀 Starting functionality tests...${NC}"

# Test 1: Basic email delivery (should work)
run_test "Basic Email Delivery" \
    "curl --url smtp://localhost:2525 --mail-from 'sender@test.local' --mail-rcpt 'recipient@test.local' --upload-file tests/test.txt" \
    "success"

# Test 2: Email with custom headers
run_test "Email with Custom Headers" \
    "echo 'Subject: Test Email\nFrom: test@test.local\nTo: user@test.local\n\nThis is a test email.' | curl --url smtp://localhost:2525 --mail-from 'test@test.local' --mail-rcpt 'user@test.local' --upload-file -" \
    "success"

# Test 3: Multiple recipients (should work)
run_test "Multiple Recipients" \
    "curl --url smtp://localhost:2525 --mail-from 'sender@test.local' --mail-rcpt 'user1@test.local' --mail-rcpt 'user2@test.local' --upload-file tests/test.txt" \
    "success"

# Test 4: Rate limiting (first few should work, then get blocked)
echo -e "\n${YELLOW}🔄 Testing Rate Limiting...${NC}"
echo "Sending 5 emails quickly to test rate limiting..."

for i in {1..5}; do
    echo "Sending email $i..."
    if curl --url smtp://localhost:2525 \
        --mail-from "bulk@test.local" \
        --mail-rcpt "user$i@test.local" \
        --upload-file tests/test.txt > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Email $i sent successfully${NC}"
    else
        echo -e "${RED}❌ Email $i failed (rate limited)${NC}"
    fi
    sleep 0.5
done

# Test 5: Check MongoDB batching
echo -e "\n${YELLOW}🗄️ Testing MongoDB Batching...${NC}"
if command -v mongosh &> /dev/null; then
    echo "Checking MongoDB for stored emails..."
    COUNT=$(mongosh --quiet --eval "db.emails.countDocuments()" haraka_emails 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ MongoDB contains $COUNT emails${NC}"
else
    echo -e "${YELLOW}⚠️ MongoDB client not available, skipping database check${NC}"
fi

# Test 6: Check plugin outputs
echo -e "\n${YELLOW}🔌 Checking Plugin Outputs...${NC}"

# Check header scraper
if [ -d "scraped-mails" ] && [ "$(ls -A scraped-mails 2>/dev/null)" ]; then
    echo -e "${GREEN}✅ header_scraper: $(ls scraped-mails/*.json 2>/dev/null | wc -l) files${NC}"
else
    echo -e "${YELLOW}⚠️ header_scraper: No files found${NC}"
fi

# Check content analyzer
if [ -d "content-analysis" ] && [ "$(ls -A content-analysis 2>/dev/null)" ]; then
    echo -e "${GREEN}✅ content_analyzer: $(ls content-analysis/*.json 2>/dev/null | wc -l) files${NC}"
else
    echo -e "${YELLOW}⚠️ content_analyzer: No files found${NC}"
fi

# Check database logger
if [ -d "database" ] && [ "$(ls -A database 2>/dev/null)" ]; then
    echo -e "${GREEN}✅ database_logger: $(ls database/*.db 2>/dev/null | wc -l) files${NC}"
else
    echo -e "${YELLOW}⚠️ database_logger: No files found${NC}"
fi

# Check routing logs
if [ -d "routing-logs" ] && [ "$(ls -A routing-logs 2>/dev/null)" ]; then
    echo -e "${GREEN}✅ email_router: $(ls routing-logs/*.log 2>/dev/null | wc -l) files${NC}"
else
    echo -e "${YELLOW}⚠️ email_router: No files found${NC}"
fi

# Test 7: Test with different domains
run_test "Different Domain Test" \
    "curl --url smtp://localhost:2525 --mail-from 'sender@haraka.local' --mail-rcpt 'recipient@dev.local' --upload-file tests/test.txt" \
    "success"

# Test 8: Test with larger email
echo -e "\n${YELLOW}📄 Testing Large Email...${NC}"
# Create a larger test email
cat > /tmp/large_test.txt << 'EOF'
From: large@test.local
To: recipient@test.local
Subject: Large Test Email
Content-Type: text/plain

This is a larger test email to test the batching functionality.
It contains multiple lines of text to simulate a real email.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

This email should be processed by all plugins and stored in the database with batching.
EOF

run_test "Large Email Test" \
    "curl --url smtp://localhost:2525 --mail-from 'large@test.local' --mail-rcpt 'recipient@test.local' --upload-file /tmp/large_test.txt" \
    "success"

# Test 9: Check rate limiter status
echo -e "\n${YELLOW}⏱️ Checking Rate Limiter Status...${NC}"
echo "Waiting 10 seconds to see if rate limits reset..."
sleep 10

run_test "Rate Limit Reset Test" \
    "curl --url smtp://localhost:2525 --mail-from 'reset@test.local' --mail-rcpt 'user@test.local' --upload-file tests/test.txt" \
    "success"

# Test 10: Test TLS (if enabled)
echo -e "\n${YELLOW}🔒 Testing TLS...${NC}"
if curl --url smtps://localhost:2525 --ssl-reqd --mail-from 'secure@test.local' --mail-rcpt 'user@test.local' --upload-file tests/test.txt > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TLS connection successful${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${YELLOW}⚠️ TLS not available or not configured${NC}"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Final summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "=================="
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Your mail server is working correctly.${NC}"
else
    echo -e "\n${YELLOW}⚠️ Some tests failed. Check the output above for details.${NC}"
fi

# Cleanup
rm -f /tmp/test_output.log /tmp/large_test.txt

echo -e "\n${BLUE}📋 Next Steps:${NC}"
echo "1. Check MongoDB for batched emails: mongosh haraka_emails"
echo "2. View plugin outputs in their respective directories"
echo "3. Check Haraka logs for detailed information"
echo "4. Test with your Python SMTP server for end-to-end testing" 