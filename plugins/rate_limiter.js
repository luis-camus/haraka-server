const fs = require('fs');
const path = require('path');

// In-memory store for rate limiting (in production, use Redis or database)
const rateLimitStore = new Map();

// Configuration
const RATE_LIMIT_CONFIG = {
  maxEmailsPerMinute: 50,  // Increased for testing
  maxEmailsPerHour: 500,   // Increased for testing
  maxEmailsPerDay: 5000,   // Increased for testing
  windowSizeMs: 60000, // 1 minute
  hourWindowMs: 3600000, // 1 hour
  dayWindowMs: 86400000 // 24 hours
};

exports.register = function () {
  this.register_hook('connect', 'check_rate_limit');
  this.register_hook('data_post', 'update_rate_limit');
};

exports.check_rate_limit = function (next, connection) {
  const clientIP = connection.remote_ip;
  
  if (!clientIP) {
    return next();
  }

  const now = Date.now();
  const clientData = rateLimitStore.get(clientIP) || {
    emails: [],
    blocked: false,
    blockUntil: 0
  };

  // Check if client is currently blocked
  if (clientData.blocked && now < clientData.blockUntil) {
    const remainingBlockTime = Math.ceil((clientData.blockUntil - now) / 1000);
    connection.logwarn(this, `Rate limit exceeded for ${clientIP}, blocked for ${remainingBlockTime}s more`);
    return next(DENY, `Rate limit exceeded. Try again in ${remainingBlockTime} seconds.`);
  }

  // Clean old entries (older than 24 hours)
  clientData.emails = clientData.emails.filter(timestamp => 
    now - timestamp < RATE_LIMIT_CONFIG.dayWindowMs
  );

  // Check rate limits
  const emailsLastMinute = clientData.emails.filter(timestamp => 
    now - timestamp < RATE_LIMIT_CONFIG.windowSizeMs
  ).length;

  const emailsLastHour = clientData.emails.filter(timestamp => 
    now - timestamp < RATE_LIMIT_CONFIG.hourWindowMs
  ).length;

  const emailsLastDay = clientData.emails.length;

  // Check if any limits are exceeded
  if (emailsLastMinute > RATE_LIMIT_CONFIG.maxEmailsPerMinute) {
    clientData.blocked = true;
    clientData.blockUntil = now + (5 * 60000); // Block for 5 minutes
    rateLimitStore.set(clientIP, clientData);
    connection.logwarn(this, `Rate limit exceeded for ${clientIP}: ${emailsLastMinute} emails in last minute`);
    return next(DENY, 'Rate limit exceeded. Too many emails per minute.');
  }

  if (emailsLastHour > RATE_LIMIT_CONFIG.maxEmailsPerHour) {
    clientData.blocked = true;
    clientData.blockUntil = now + (30 * 60000); // Block for 30 minutes
    rateLimitStore.set(clientIP, clientData);
    connection.logwarn(this, `Rate limit exceeded for ${clientIP}: ${emailsLastHour} emails in last hour`);
    return next(DENY, 'Rate limit exceeded. Too many emails per hour.');
  }

  if (emailsLastDay > RATE_LIMIT_CONFIG.maxEmailsPerDay) {
    clientData.blocked = true;
    clientData.blockUntil = now + (24 * 60 * 60000); // Block for 24 hours
    rateLimitStore.set(clientIP, clientData);
    connection.logwarn(this, `Rate limit exceeded for ${clientIP}: ${emailsLastDay} emails in last day`);
    return next(DENY, 'Rate limit exceeded. Too many emails per day.');
  }

  // Store current state
  rateLimitStore.set(clientIP, clientData);

  // Log current usage
  connection.loginfo(this, `Rate limit check for ${clientIP}: ${emailsLastMinute}/min, ${emailsLastHour}/hour, ${emailsLastDay}/day`);

  return next();
};

exports.update_rate_limit = function (next, connection) {
  const clientIP = connection.remote_ip;
  
  if (!clientIP) {
    return next();
  }

  const now = Date.now();
  const clientData = rateLimitStore.get(clientIP) || { emails: [], blocked: false, blockUntil: 0 };

  // Add current email timestamp
  clientData.emails.push(now);

  // Keep only last 24 hours of data
  clientData.emails = clientData.emails.filter(timestamp => 
    now - timestamp < RATE_LIMIT_CONFIG.dayWindowMs
  );

  rateLimitStore.set(clientIP, clientData);

  connection.loginfo(this, `Updated rate limit for ${clientIP}: ${clientData.emails.length} emails in last 24 hours`);

  return next();
}; 