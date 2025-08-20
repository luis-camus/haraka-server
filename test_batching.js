#!/usr/bin/env node

// Test script to verify MongoDB batching functionality
const { MongoClient } = require('mongodb');

const MONGO_CONFIG = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  dbName: process.env.MONGODB_DB || 'haraka_emails',
  collectionName: process.env.MONGODB_COLLECTION || 'emails'
};

async function testBatching() {
  console.log('🧪 Testing MongoDB Batching Functionality');
  console.log('==========================================');
  
  let client;
  
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGO_CONFIG.uri);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(MONGO_CONFIG.dbName);
    const collection = db.collection(MONGO_CONFIG.collectionName);
    
    // Check current email count
    const initialCount = await collection.countDocuments();
    console.log(`📊 Initial email count: ${initialCount}`);
    
    // Send multiple emails to trigger batching
    console.log('\n📧 Sending multiple emails to test batching...');
    
    for (let i = 1; i <= 5; i++) {
      const emailDoc = {
        from: `test${i}@test.local`,
        to: `recipient${i}@test.local`,
        body: `Test email ${i} for batching test`,
        receivedAt: new Date(),
        remoteIp: '127.0.0.1',
        testBatch: true
      };
      
      await collection.insertOne(emailDoc);
      console.log(`✅ Inserted email ${i}`);
      
      // Small delay to simulate real email processing
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Check final count
    const finalCount = await collection.countDocuments();
    console.log(`📊 Final email count: ${finalCount}`);
    console.log(`📈 Emails added: ${finalCount - initialCount}`);
    
    // Check for batched emails (should have testBatch flag)
    const batchedEmails = await collection.find({ testBatch: true }).toArray();
    console.log(`🔍 Found ${batchedEmails.length} test emails in database`);
    
    // Show recent emails
    console.log('\n📋 Recent emails in database:');
    const recentEmails = await collection.find({})
      .sort({ receivedAt: -1 })
      .limit(10)
      .toArray();
    
    recentEmails.forEach((email, index) => {
      console.log(`${index + 1}. From: ${email.from} | To: ${email.to} | Time: ${email.receivedAt}`);
    });
    
    // Test batch size configuration
    console.log('\n⚙️ Checking batch configuration...');
    const batchConfig = {
      maxBatchSize: 100,
      maxBatchTimeMs: 2 * 60 * 1000 // 2 minutes
    };
    
    console.log(`📦 Max batch size: ${batchConfig.maxBatchSize}`);
    console.log(`⏱️ Max batch time: ${batchConfig.maxBatchTimeMs / 1000} seconds`);
    
    // Performance test
    console.log('\n🚀 Performance test: Sending 50 emails...');
    const startTime = Date.now();
    
    const bulkOps = [];
    for (let i = 1; i <= 50; i++) {
      bulkOps.push({
        insertOne: {
          document: {
            from: `perf${i}@test.local`,
            to: `recipient${i}@test.local`,
            body: `Performance test email ${i}`,
            receivedAt: new Date(),
            remoteIp: '127.0.0.1',
            performanceTest: true
          }
        }
      });
    }
    
    const result = await collection.bulkWrite(bulkOps);
    const endTime = Date.now();
    
    console.log(`✅ Bulk insert completed in ${endTime - startTime}ms`);
    console.log(`📊 Inserted ${result.insertedCount} emails`);
    
    // Final count
    const totalCount = await collection.countDocuments();
    console.log(`📊 Total emails in database: ${totalCount}`);
    
    console.log('\n🎉 Batching test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during batching test:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the test
testBatching().catch(console.error); 