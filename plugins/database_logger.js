const fs = require('fs');
const path = require('path');

// Database configuration
const DB_CONFIG = {
  type: 'sqlite', // 'sqlite', 'mysql', 'mongodb'
  enabled: true,
  
  // SQLite configuration
  sqlite: {
    database: path.resolve(__dirname, '../database/emails.db'),
    table: 'emails'
  },
  
  // MySQL configuration (if using MySQL)
  mysql: {
    host: 'localhost',
    port: 3306,
    user: 'haraka_user',
    password: 'password',
    database: 'haraka_emails'
  },
  
  // MongoDB configuration (if using MongoDB)
  mongodb: {
    url: 'mongodb://localhost:27017/haraka_emails',
    collection: 'emails'
  }
};

let db = null;

exports.register = function () {
  this.register_hook('data_post', 'log_to_database');
  
  // Initialize database connection
  initializeDatabase();
};

function initializeDatabase() {
  if (!DB_CONFIG.enabled) return;

  try {
    switch (DB_CONFIG.type) {
      case 'sqlite':
        initializeSQLite();
        break;
      case 'mysql':
        initializeMySQL();
        break;
      case 'mongodb':
        initializeMongoDB();
        break;
      default:
        console.error('Unsupported database type:', DB_CONFIG.type);
    }
  } catch (error) {
    console.error('Database initialization failed:', error.message);
  }
}

function initializeSQLite() {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = DB_CONFIG.sqlite.database;
  
  // Ensure database directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  db = new sqlite3.Database(dbPath);
  
  // Create table if it doesn't exist
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS ${DB_CONFIG.sqlite.table} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT UNIQUE,
      from_email TEXT,
      to_email TEXT,
      subject TEXT,
      date TEXT,
      client_ip TEXT,
      body_length INTEGER,
      has_attachments BOOLEAN,
      attachment_count INTEGER,
      headers TEXT,
      body_preview TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('Failed to create SQLite table:', err.message);
    } else {
      console.log('SQLite database initialized successfully');
    }
  });
}

function initializeMySQL() {
  // This would require mysql2 package
  // const mysql = require('mysql2/promise');
  console.log('MySQL initialization not implemented yet');
}

function initializeMongoDB() {
  // This would require mongodb package
  // const { MongoClient } = require('mongodb');
  console.log('MongoDB initialization not implemented yet');
}

exports.log_to_database = function (next, connection) {
  const txn = connection.transaction;
  if (!txn || !DB_CONFIG.enabled || !db) return next();

  const headers = txn.header;
  const emailData = {
    message_id: headers.get('message-id'),
    from_email: headers.get('from'),
    to_email: headers.get('to'),
    subject: headers.get('subject'),
    date: headers.get('date'),
    client_ip: connection.remote_ip,
    body_length: txn.body ? txn.body.length : 0,
    has_attachments: txn.attachment_hooks && txn.attachment_hooks.length > 0,
    attachment_count: txn.attachment_hooks ? txn.attachment_hooks.length : 0,
    headers: JSON.stringify(headers.headers_decoded),
    body_preview: txn.body ? txn.body.substring(0, 500) + (txn.body.length > 500 ? '...' : '') : ''
  };

  // Store in database based on type
  switch (DB_CONFIG.type) {
    case 'sqlite':
      storeInSQLite(emailData, connection);
      break;
    case 'mysql':
      storeInMySQL(emailData, connection);
      break;
    case 'mongodb':
      storeInMongoDB(emailData, connection);
      break;
  }

  return next();
};

function storeInSQLite(emailData, connection) {
  const sql = `
    INSERT OR REPLACE INTO ${DB_CONFIG.sqlite.table} 
    (message_id, from_email, to_email, subject, date, client_ip, body_length, 
     has_attachments, attachment_count, headers, body_preview)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    emailData.message_id,
    emailData.from_email,
    emailData.to_email,
    emailData.subject,
    emailData.date,
    emailData.client_ip,
    emailData.body_length,
    emailData.has_attachments ? 1 : 0,
    emailData.attachment_count,
    emailData.headers,
    emailData.body_preview
  ];

  db.run(sql, params, function(err) {
    if (err) {
      connection.logerror(this, `Failed to store email in SQLite: ${err.message}`);
    } else {
      connection.loginfo(this, `Email stored in SQLite with ID: ${this.lastID}`);
    }
  });
}

function storeInMySQL(emailData, connection) {
  // MySQL implementation would go here
  connection.loginfo(this, 'MySQL storage not implemented yet');
}

function storeInMongoDB(emailData, connection) {
  // MongoDB implementation would go here
  connection.loginfo(this, 'MongoDB storage not implemented yet');
}

// Utility functions for querying the database
exports.getEmailStats = function() {
  return new Promise((resolve, reject) => {
    if (!db || DB_CONFIG.type !== 'sqlite') {
      reject(new Error('Database not available or not SQLite'));
      return;
    }

    const sql = `
      SELECT 
        COUNT(*) as total_emails,
        COUNT(DISTINCT from_email) as unique_senders,
        COUNT(DISTINCT to_email) as unique_recipients,
        AVG(body_length) as avg_body_length,
        SUM(has_attachments) as emails_with_attachments
      FROM ${DB_CONFIG.sqlite.table}
    `;

    db.get(sql, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

exports.searchEmails = function(searchTerm, limit = 10) {
  return new Promise((resolve, reject) => {
    if (!db || DB_CONFIG.type !== 'sqlite') {
      reject(new Error('Database not available or not SQLite'));
      return;
    }

    const sql = `
      SELECT * FROM ${DB_CONFIG.sqlite.table}
      WHERE subject LIKE ? OR from_email LIKE ? OR to_email LIKE ?
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const searchPattern = `%${searchTerm}%`;
    const params = [searchPattern, searchPattern, searchPattern, limit];

    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}; 