const Database = require("better-sqlite3");
const config = require("../utils/config");
const logger = require("../utils/logger");
const path = require("path");

class MeetingDatabase {
  constructor() {
    this.db = new Database(config.database.path);
    this.initializeSchema();
  }

  initializeSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id TEXT NOT NULL,
        organizer_email TEXT NOT NULL,
        organizer_name TEXT,
        status TEXT DEFAULT 'pending_selection',
        available_slots TEXT,
        selected_slot TEXT,
        participants TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS meeting_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meeting_id INTEGER NOT NULL,
        name TEXT,
        email TEXT NOT NULL,
        timezone TEXT DEFAULT 'Asia/Kolkata',
        FOREIGN KEY (meeting_id) REFERENCES meetings (id)
      );
    `);
    logger.info("Meeting database schema initialized");
  }

  createMeeting(threadId, organizerEmail, organizerName, availableSlots) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO meetings (thread_id, organizer_email, organizer_name, available_slots, status)
        VALUES (?, ?, ?, ?, 'pending_selection')
      `);

      const result = stmt.run(
        threadId,
        organizerEmail,
        organizerName,
        JSON.stringify(availableSlots)
      );

      logger.info(`Meeting created with ID: ${result.lastInsertRowid}`);
      return result.lastInsertRowid;
    } catch (error) {
      logger.error("Failed to create meeting", error);
      return null;
    }
  }

  addParticipant(meetingId, name, email, timezone = "Asia/Kolkata") {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO meeting_participants (meeting_id, name, email, timezone)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(meetingId, name, email, timezone);
      logger.info(`Participant ${email} added to meeting ${meetingId}`);
      return true;
    } catch (error) {
      logger.error("Failed to add participant", error);
      return false;
    }
  }

  updateMeetingSlot(threadId, selectedSlot) {
    try {
      const stmt = this.db.prepare(`
        UPDATE meetings 
        SET selected_slot = ?, status = 'confirmed', updated_at = CURRENT_TIMESTAMP
        WHERE thread_id = ?
      `);

      stmt.run(JSON.stringify(selectedSlot), threadId);
      logger.info(`Meeting slot updated for thread: ${threadId}`);
      return true;
    } catch (error) {
      logger.error("Failed to update meeting slot", error);
      return false;
    }
  }

  getMeetingByThread(threadId) {
    try {
      // Try exact match first
      let stmt = this.db.prepare(`
        SELECT * FROM meetings WHERE thread_id = ? ORDER BY created_at DESC LIMIT 1
      `);
      let meeting = stmt.get(threadId);

      if (meeting) {
        meeting.available_slots = JSON.parse(meeting.available_slots || "[]");
        meeting.selected_slot = meeting.selected_slot
          ? JSON.parse(meeting.selected_slot)
          : null;
      }

      return meeting;
    } catch (error) {
      logger.error("Failed to get meeting by thread", error);
      return null;
    }
  }

  getMeetingByOrganizerEmail(organizerEmail, status = 'pending_selection') {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM meetings 
        WHERE organizer_email = ? AND status = ?
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      const meeting = stmt.get(organizerEmail, status);

      if (meeting) {
        meeting.available_slots = JSON.parse(meeting.available_slots || "[]");
        meeting.selected_slot = meeting.selected_slot
          ? JSON.parse(meeting.selected_slot)
          : null;
      }

      return meeting;
    } catch (error) {
      logger.error("Failed to get meeting by organizer email", error);
      return null;
    }
  }

  updateMeetingSlotById(meetingId, selectedSlot) {
    try {
      const stmt = this.db.prepare(`
        UPDATE meetings 
        SET selected_slot = ?, status = 'confirmed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(JSON.stringify(selectedSlot), meetingId);
      logger.info(`Meeting slot updated for meeting ID: ${meetingId}`);
      return true;
    } catch (error) {
      logger.error("Failed to update meeting slot", error);
      return false;
    }
  }

  getParticipants(meetingId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM meeting_participants WHERE meeting_id = ?
      `);

      return stmt.all(meetingId);
    } catch (error) {
      logger.error("Failed to get participants", error);
      return [];
    }
  }
}

module.exports = new MeetingDatabase();
