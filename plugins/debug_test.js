const fs = require('fs');
const path = require('path');

exports.register = function () {
  console.log('🔧 DEBUG: debug_test plugin registered');
  this.register_hook('data_post', 'debug_test');
};

exports.debug_test = function (next, connection) {
  console.log('🔧 DEBUG: debug_test function called');
  
  try {
    // Create a simple test file
    const testFile = path.resolve(__dirname, '../debug-test.txt');
    const content = `Debug test at ${new Date().toISOString()}\n`;
    
    console.log('🔧 DEBUG: Writing to:', testFile);
    fs.writeFileSync(testFile, content);
    console.log('🔧 DEBUG: File written successfully');
    
    connection.loginfo(this, 'Debug test plugin executed successfully');
  } catch (error) {
    console.error('🔧 DEBUG: Error in debug_test:', error.message);
    connection.logerror(this, `Debug test error: ${error.message}`);
  }
  
  return next();
}; 