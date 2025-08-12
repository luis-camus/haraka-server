#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  smtpHost: 'localhost',
  smtpPort: '2525',
  testEmailFile: 'tests/test.txt',
  testSpamFile: 'tests/test-spam-soft.txt',
  testSecureFile: 'tests/secured-smtp-mail.txt'
};

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Normal Email',
    from: 'sender@example.com',
    to: 'recipient@example.com',
    file: TEST_CONFIG.testEmailFile,
    description: 'Basic email to test header scraping and content analysis'
  },
  {
    name: 'Marketing Email',
    from: 'marketing@example.com',
    to: 'customer@example.com',
    file: TEST_CONFIG.testSpamFile,
    description: 'Email with marketing content to test content analysis'
  },
  {
    name: 'Urgent Email',
    from: 'support@company.com',
    to: 'user@example.com',
    file: TEST_CONFIG.testEmailFile,
    description: 'Email with urgent subject to test routing'
  },
  {
    name: 'Invoice Email',
    from: 'billing@company.com',
    to: 'customer@example.com',
    file: TEST_CONFIG.testEmailFile,
    description: 'Email with invoice subject to test routing'
  },
  {
    name: 'Rate Limit Test',
    from: 'bulk@example.com',
    to: 'user@example.com',
    file: TEST_CONFIG.testEmailFile,
    description: 'Multiple emails to test rate limiting'
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function sendEmail(scenario) {
  return new Promise((resolve, reject) => {
    const curlArgs = [
      '--url', `smtp://${TEST_CONFIG.smtpHost}:${TEST_CONFIG.smtpPort}`,
      '--mail-from', scenario.from,
      '--mail-rcpt', scenario.to,
      '--upload-file', scenario.file
    ];

    log(`📧 Sending: ${scenario.name}`, 'cyan');
    log(`   From: ${scenario.from}`, 'yellow');
    log(`   To: ${scenario.to}`, 'yellow');
    log(`   Description: ${scenario.description}`, 'yellow');

    const curl = spawn('curl', curlArgs);

    let stdout = '';
    let stderr = '';

    curl.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    curl.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    curl.on('close', (code) => {
      if (code === 0) {
        log(`✅ Success: ${scenario.name}`, 'green');
        resolve({ success: true, scenario, stdout, stderr });
      } else {
        log(`❌ Failed: ${scenario.name} (code: ${code})`, 'red');
        log(`   Error: ${stderr}`, 'red');
        reject({ success: false, scenario, stdout, stderr, code });
      }
    });

    curl.on('error', (error) => {
      log(`❌ Error: ${scenario.name} - ${error.message}`, 'red');
      reject({ success: false, scenario, error: error.message });
    });
  });
}

async function runRateLimitTest() {
  log('\n🚀 Running Rate Limit Test...', 'magenta');
  
  const rateLimitScenario = TEST_SCENARIOS.find(s => s.name === 'Rate Limit Test');
  const promises = [];
  
  // Send 15 emails quickly (should trigger rate limiting)
  for (let i = 0; i < 15; i++) {
    const scenario = {
      ...rateLimitScenario,
      from: `bulk@example.com`, // Same sender to trigger rate limiting
      to: `user${i}@example.com`
    };
    
    // Send emails more quickly to trigger rate limiting
    const delay = i * 50; // Reduced delay
    promises.push(
      new Promise(resolve => setTimeout(resolve, delay))
        .then(() => sendEmail(scenario))
    );
  }
  
  const results = await Promise.allSettled(promises);
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;
  
  log(`📊 Rate Limit Test Results:`, 'blue');
  log(`   Successful: ${successful}`, 'green');
  log(`   Failed (rate limited): ${failed}`, 'red');
}

async function checkPluginOutputs() {
  log('\n📁 Checking Plugin Outputs...', 'magenta');
  
  const outputs = [
    { dir: 'scraped-mails', plugin: 'header_scraper' },
    { dir: 'content-analysis', plugin: 'content_analyzer' },
    { dir: 'routing-logs', plugin: 'email_router' },
    { dir: 'database', plugin: 'database_logger' }
  ];
  
  outputs.forEach(output => {
    const dirPath = path.resolve(__dirname, output.dir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      log(`✅ ${output.plugin}: ${files.length} files in ${output.dir}/`, 'green');
    } else {
      log(`❌ ${output.plugin}: Directory ${output.dir}/ not found`, 'red');
    }
  });
}

async function main() {
  log('🧪 Haraka Plugin Test Suite', 'bright');
  log('=============================\n', 'bright');
  
  // Check if test files exist
  if (!fs.existsSync(TEST_CONFIG.testEmailFile)) {
    log(`❌ Test file not found: ${TEST_CONFIG.testEmailFile}`, 'red');
    log('   Please create the test file first.', 'yellow');
    return;
  }
  
  // Run individual tests
  for (const scenario of TEST_SCENARIOS) {
    if (scenario.name !== 'Rate Limit Test') {
      try {
        await sendEmail(scenario);
        // Add delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        log(`   Test failed: ${error.message}`, 'red');
      }
    }
  }
  
  // Run rate limit test
  await runRateLimitTest();
  
  // Check plugin outputs
  await checkPluginOutputs();
  
  log('\n🎉 Test suite completed!', 'green');
  log('Check the output directories for plugin results.', 'cyan');
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  log('Haraka Plugin Test Suite', 'bright');
  log('Usage: node test_plugins.js [options]', 'cyan');
  log('Options:', 'yellow');
  log('  --rate-limit-only    Run only rate limit test', 'yellow');
  log('  --check-outputs      Check plugin outputs only', 'yellow');
  log('  --help, -h          Show this help', 'yellow');
  process.exit(0);
}

if (args.includes('--rate-limit-only')) {
  runRateLimitTest().catch(console.error);
} else if (args.includes('--check-outputs')) {
  checkPluginOutputs();
} else {
  main().catch(console.error);
} 