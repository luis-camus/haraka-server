# 🧪 Testing Guide for Haraka Mail Server

This guide will help you test all the functionality of your enhanced Haraka mail server, including batching, signing, encryption, and rate limiting.

## 📋 Prerequisites

1. **Haraka Server Running**: Make sure Haraka is running
   ```bash
   haraka -c /Users/luisc/pulsar-projects/haraka-server
   ```

2. **MongoDB Running**: Ensure MongoDB is available
   ```bash
   # Check if MongoDB is running
   brew services list | grep mongodb
   ```

3. **Local DNS Setup**: Run the DNS setup script
   ```bash
   sudo ./setup_local_dns.sh
   ```

## 🚀 Quick Start Testing

### 1. Basic Functionality Test
```bash
./test_functionality.sh
```
This comprehensive test covers:
- Basic email delivery
- Multiple recipients
- Rate limiting
- MongoDB batching
- Plugin outputs
- TLS encryption

### 2. Test Without Rate Limiting
If you're getting rate limit errors, test without rate limiting:
```bash
./test_without_rate_limit.sh
```

### 3. MongoDB Batching Test
Test the batching functionality specifically:
```bash
node test_batching.js
```

## 📧 Manual Testing

### Basic Email Test
```bash
curl --url smtp://localhost:2525 \
     --mail-from "sender@test.local" \
     --mail-rcpt "recipient@test.local" \
     --upload-file tests/test.txt
```

### Multiple Recipients Test
```bash
curl --url smtp://localhost:2525 \
     --mail-from "sender@test.local" \
     --mail-rcpt "user1@test.local" \
     --mail-rcpt "user2@test.local" \
     --mail-rcpt "user3@test.local" \
     --upload-file tests/test.txt
```

### Rate Limiting Test
```bash
# Send multiple emails quickly to trigger rate limiting
for i in {1..15}; do
  curl --url smtp://localhost:2525 \
       --mail-from "bulk@test.local" \
       --mail-rcpt "user$i@test.local" \
       --upload-file tests/test.txt
  sleep 0.1
done
```

## 🔍 Checking Results

### 1. MongoDB Database
```bash
# Connect to MongoDB
mongosh haraka_emails

# Check email count
db.emails.countDocuments()

# View recent emails
db.emails.find().sort({receivedAt: -1}).limit(10)

# Check for batched emails
db.emails.find({testBatch: true})
```

### 2. Plugin Outputs

**Header Scraper**:
```bash
ls -la scraped-mails/
cat scraped-mails/*.json
```

**Content Analyzer**:
```bash
ls -la content-analysis/
cat content-analysis/*.json
```

**Database Logger**:
```bash
ls -la database/
```

**Routing Logs**:
```bash
ls -la routing-logs/
cat routing-logs/*.log
```

### 3. Haraka Logs
Check Haraka logs for detailed information:
```bash
# If running in foreground, logs appear in terminal
# If running as daemon, check log files
tail -f /var/log/haraka.log
```

## ⚙️ Configuration Testing

### Rate Limiter Configuration
The rate limiter is configured in `plugins/rate_limiter.js`:
- `maxEmailsPerMinute: 10`
- `maxEmailsPerHour: 100`
- `maxEmailsPerDay: 1000`

To make it less restrictive for testing:
```javascript
const RATE_LIMIT_CONFIG = {
  maxEmailsPerMinute: 50,  // Increase from 10
  maxEmailsPerHour: 500,   // Increase from 100
  maxEmailsPerDay: 5000,   // Increase from 1000
  // ... rest of config
};
```

### MongoDB Batching Configuration
Batching is configured in `plugins/mongodb_logger.js`:
- `maxBatchSize: 100` (send when 100 emails collected)
- `maxBatchTimeMs: 2 * 60 * 1000` (send after 2 minutes)

## 🔧 Troubleshooting

### Common Issues

1. **Rate Limiting Too Restrictive**
   - Error: `RCPT failed: 550`
   - Solution: Adjust rate limiter settings or temporarily disable it

2. **MongoDB Connection Issues**
   - Error: Connection refused
   - Solution: Ensure MongoDB is running: `brew services start mongodb-community`

3. **Plugin Not Working**
   - Check if plugin is enabled in `config/plugins`
   - Check Haraka logs for errors
   - Verify plugin file exists in `plugins/` directory

4. **DNS Issues**
   - Error: Domain not found
   - Solution: Run `sudo ./setup_local_dns.sh`

### Debug Mode
Run Haraka in debug mode for more verbose output:
```bash
haraka -c /Users/luisc/pulsar-projects/haraka-server --debug
```

## 📊 Performance Testing

### Load Testing
Test with high volume:
```bash
# Send 100 emails quickly
for i in {1..100}; do
  curl --url smtp://localhost:2525 \
       --mail-from "load@test.local" \
       --mail-rcpt "user$i@test.local" \
       --upload-file tests/test.txt &
done
wait
```

### Batching Performance
Monitor MongoDB for batched inserts:
```bash
# Watch MongoDB in real-time
mongosh haraka_emails --eval "
  db.emails.watch().forEach(function(change) {
    print('Change:', JSON.stringify(change));
  });
"
```

## 🎯 Expected Results

### Successful Test Results
- ✅ Emails accepted by Haraka
- ✅ MongoDB contains emails (with batching)
- ✅ Plugin outputs generated
- ✅ Rate limiting working (blocks after limit)
- ✅ TLS working (if configured)

### Performance Benchmarks
- **Throughput**: 100+ emails/second
- **Batching**: Emails sent in batches of 100 or every 2 minutes
- **Rate Limiting**: Blocks after 10 emails/minute
- **Database**: MongoDB inserts in batches

## 📝 Test Checklist

- [ ] Basic email delivery works
- [ ] Multiple recipients work
- [ ] Rate limiting functions correctly
- [ ] MongoDB batching works
- [ ] All plugins generate output
- [ ] TLS encryption works (if enabled)
- [ ] DKIM signing works (if enabled)
- [ ] Performance meets expectations
- [ ] Error handling works correctly

## 🚀 Next Steps

After successful testing:
1. Configure production settings
2. Set up proper TLS certificates
3. Configure DKIM keys
4. Set up monitoring and alerting
5. Deploy to production environment 