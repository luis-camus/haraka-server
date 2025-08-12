exports.register = function () {
  this.loginfo('Custom Filter plugin loaded');
  this.register_hook('data_post', 'check_subject');
};

// Define banned keywords
const bannedKeywords = [
  'free money',
  'urgent action',
  'you won',
  'claim now',
  'lottery',
  'click here',
  'risk-free',
  'congratulations',
  'get rich',
  'easy cash'
];

exports.check_subject = function (next, connection) {
  const txn = connection.transaction;
  if (!txn || !txn.header) return next();

  const subject = txn.header.get('subject') || '';

  // Convert to lowercase for case-insensitive matching
  const subjectLower = subject.toLowerCase();

  for (let keyword of bannedKeywords) {
    if (subjectLower.includes(keyword)) {
      connection.logwarn(this, `Blocked suspicious subject: "${subject}"`);
      return next(DENY, `Message blocked due to suspicious subject: "${keyword}"`);
    }
  }

  // If passed all checks
  return next();
};