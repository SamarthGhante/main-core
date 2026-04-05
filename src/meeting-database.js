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
        subject TEXT,
        status TEXT DEFAULT 'pending_selection',
        available_slots TEXT,
        selected_slot TEXT,
        participants TEXT,
        event_id TEXT,
        meet_link TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS meeting_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meeting_id INTEGER NOT NULL,
        name TEXT,
        email TEXT NOT NULL,
        timezone TEXT DEFAULT 'Asia/Kolkata',
        priority INTEGER DEFAULT 0,
        availability_start TEXT,
        availability_end TEXT,
        has_responded INTEGER DEFAULT 0,
        FOREIGN KEY (meeting_id) REFERENCES meetings (id)
      );
    `);
    logger.info("Meeting database schema initialized");
  }

  createMeeting(threadId, organizerEmail, organizerName, availableSlots, subject = null) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO meetings (thread_id, organizer_email, organizer_name, subject, available_slots, status)
        VALUES (?, ?, ?, ?, ?, 'pending_selection')
      `);

      const result = stmt.run(
        threadId,
        organizerEmail,
        organizerName,
        subject,
        JSON.stringify(availableSlots)
      );

      logger.info(`Meeting created with ID: ${result.lastInsertRowid}`);
      return result.lastInsertRowid;
    } catch (error) {
      logger.error("Failed to create meeting", error);
      return null;
    }
  }

  addParticipant(meetingId, name, email, timezone = "Asia/Kolkata", priority = 0) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO meeting_participants (meeting_id, name, email, timezone, priority)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(meetingId, name, email, timezone, priority);
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
        SET selected_slot = ?, status = 'awaiting_responses', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(JSON.stringify(selectedSlot), meetingId);
      logger.info(`Meeting slot updated for meeting ID: ${meetingId}, status: awaiting_responses`);
      return true;
    } catch (error) {
      logger.error("Failed to update meeting slot", error);
      return false;
    }
  }

  getParticipants(meetingId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM meeting_participants WHERE meeting_id = ? ORDER BY priority DESC
      `);

      return stmt.all(meetingId);
    } catch (error) {
      logger.error("Failed to get participants", error);
      return [];
    }
  }

  updateParticipantAvailability(email, meetingId, startTime, endTime) {
    try {
      const stmt = this.db.prepare(`
        UPDATE meeting_participants 
        SET availability_start = ?, availability_end = ?, has_responded = 1
        WHERE email = ? AND meeting_id = ?
      `);

      stmt.run(startTime, endTime, email, meetingId);
      logger.info(`Availability updated for ${email}: ${startTime} - ${endTime}`);
      return true;
    } catch (error) {
      logger.error("Failed to update participant availability", error);
      return false;
    }
  }

  getMeetingByParticipantEmail(email) {
    try {
      const stmt = this.db.prepare(`
        SELECT m.* FROM meetings m
        JOIN meeting_participants p ON m.id = p.meeting_id
        WHERE p.email = ? AND m.status = 'awaiting_responses' AND p.has_responded = 0
        ORDER BY m.created_at DESC
        LIMIT 1
      `);

      const meeting = stmt.get(email);

      if (meeting) {
        meeting.available_slots = JSON.parse(meeting.available_slots || "[]");
        meeting.selected_slot = meeting.selected_slot
          ? JSON.parse(meeting.selected_slot)
          : null;
      }

      return meeting;
    } catch (error) {
      logger.error("Failed to get meeting by participant email", error);
      return null;
    }
  }

  checkAllParticipantsResponded(meetingId) {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as total, SUM(has_responded) as responded
        FROM meeting_participants
        WHERE meeting_id = ?
      `);

      const result = stmt.get(meetingId);
      return result.total === result.responded;
    } catch (error) {
      logger.error("Failed to check participant responses", error);
      return false;
    }
  }
}

module.exports = new MeetingDatabase();
