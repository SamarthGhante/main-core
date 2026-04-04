# COEP Email Assistant

A professional email processing assistant that analyzes incoming emails and generates thread summaries.

## Project Structure

```
main/
├── src/
│   ├── index.js                    # Application entry point
│   ├── database.js                 # Email storage and retrieval
│   ├── meeting-database.js         # Meeting and participant storage
│   ├── workers.js                  # Background job processors
│   └── services/
│       ├── ai-service.js          # AI-powered email analysis
│       ├── email-sender.js        # Email sending service
│       └── meeting-service.js     # Meeting scheduling logic
├── utils/
│   ├── config.js                  # Configuration management
│   ├── logger.js                  # Professional logging utility
│   ├── email-utils.js             # Email formatting utilities
│   └── calendar-utils.js          # Google Calendar integration
├── package.json
├── tokens.json                     # Google OAuth tokens
└── .env
```

## Module Overview

### src/index.js
Main application entry point. Initializes workers and handles graceful shutdown.

### src/database.js
Singleton database manager for email storage:
- `storeEmail()` - Save incoming emails
- `getThreadHistory()` - Retrieve email thread history
- `close()` - Gracefully close database connection

### src/workers.js
Background job processors:
- `startEmailProcessor()` - Process incoming emails, detect summary requests
- `startEmailSender()` - Send outgoing emails from queue

### src/services/ai-service.js
Singleton AI service for email analysis:
- `analyzeEmail()` - Determine if summary is requested
- `generateSummary()` - Generate plain text summary of thread

### src/services/email-sender.js
Singleton email sending service:
- `sendReply()` - Send threaded reply with proper headers
- `sendEmail()` - Send standalone email

### utils/config.js
Centralized configuration for all services:
- Redis connection settings
- Groq AI model configuration
- Resend email service settings
- Database paths
- Queue names

### utils/logger.js
Professional logging system with timestamp formatting:
- `logger.info()` - General information
- `logger.error()` - Error messages with stack traces
- `logger.success()` - Success messages
- `logger.startup()` - Startup banners

### src/services/meeting-service.js
Meeting scheduling service:
- `getAvailableSlotsEmail()` - Fetch calendar slots and format message
- `parseSlotSelection()` - Parse organizer's slot choice
- `extractParticipants()` - Extract participant info from email
- `formatMeetingInvite()` - Format meeting invitation

### src/meeting-database.js
Meeting and participant storage:
- `createMeeting()` - Create new meeting request
- `addParticipant()` - Add participant to meeting
- `updateMeetingSlot()` - Save selected time slot
- `getMeetingByThread()` - Retrieve meeting by email thread
- `getParticipants()` - Get all participants for a meeting

### utils/calendar-utils.js
Google Calendar integration:
- `getDatesAndPhases()` - Fetch available slots for next 3 days
- Supports morning, afternoon, evening phases
- Multi-timezone aware

### utils/email-utils.js
Email formatting utilities:
- `wrapMessageId()` - Format message IDs for email headers
- `formatSubject()` - Add "Re:" prefix for replies
- `buildReferences()` - Build proper References header
- `formatThreadHistory()` - Format thread history for AI processing

## Features

- **Modular Architecture**: Clean separation of concerns
- **Professional Logging**: Clear, timestamped logs without emoji spam
- **Plain Text Summaries**: Simple, readable email summaries
- **Separate Functions**: Distinct email sending and response functions
- **Error Handling**: Comprehensive error handling throughout
- **Thread Support**: Proper email threading with References headers
- **Database Persistence**: SQLite storage for email history
- **Meeting Scheduling**: Automated meeting scheduling with Google Calendar
  - Automatic slot detection from organizer's calendar
  - Multi-participant support with timezone handling
  - Two-step workflow: slot selection → participant notification

## Environment Variables

Required in `.env` file:
- `REDIS_HOST` - Redis server hostname
- `GROQ_API_KEY` - Groq AI API key
- `RESEND_API_KEY` - Resend email service API key
- `CLIENT_ID` - Google OAuth client ID
- `CLIENT_SECRET` - Google OAuth client secret
