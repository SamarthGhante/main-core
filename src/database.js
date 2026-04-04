const Database = require("better-sqlite3");
const config = require("../utils/config");
const logger = require("../utils/logger");

class EmailDatabase {
  constructor() {
    this.db = new Database(config.database.path);
    this.initializeSchema();
  }

  initializeSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS email_store (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE,
        in_reply_to TEXT,
        subject TEXT,
        sender TEXT,
        body TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info("Database initialized successfully");
  }

  storeEmail(messageId, inReplyTo, subject, sender, body) {
    try {
      this.db
        .prepare(
          `INSERT OR IGNORE INTO email_store (message_id, in_reply_to, subject, sender, body) 
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(messageId, inReplyTo, subject, sender, body);
      return true;
    } catch (error) {
      logger.error("Failed to store email", error);
      return false;
    }
  }

  getThreadHistory(messageId, inReplyTo) {
    try {
      const query = this.db.prepare(`
        SELECT sender, body, timestamp 
        FROM email_store 
        WHERE message_id = ? 
           OR in_reply_to = ? 
           OR in_reply_to = (
             SELECT in_reply_to 
             FROM email_store 
             WHERE message_id = ? AND in_reply_to IS NOT NULL
           )
           OR message_id = (
             SELECT in_reply_to 
             FROM email_store 
             WHERE message_id = ?
           )
        ORDER BY timestamp ASC
      `);
      return query.all(inReplyTo, messageId, messageId, messageId);
    } catch (error) {
      logger.error("Failed to retrieve thread history", error);
      return [];
    }
  }

  close() {
    this.db.close();
    logger.info("Database connection closed");
  }
}

module.exports = new EmailDatabase();
