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
- `extractParticipants()` - Extract participant info from email (with priority)
- `formatAvailabilityRequest()` - Format availability request email
- `parseAvailabilityResponse()` - Parse participant time windows
- `printParticipantData()` - Display all participant data to terminal

### src/services/slot-calculator.js
Smart meeting time calculator:
- `generateTopSlots()` - Calculate optimal slots based on availability and priority
- `formatSlotsForEmail()` - Format calculated slots for email
- `printSlotsToTerminal()` - Display slots with detailed breakdown
- Multi-timezone normalization using Luxon
- Priority-weighted scoring algorithm
- Conflict resolution with hard constraints

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

- ✅ **Modular Architecture**: Clean separation of concerns
- ✅ **Professional Logging**: Clear, timestamped logs without emoji spam
- ✅ **Plain Text Summaries**: Simple, readable email summaries
- ✅ **Separate Functions**: Distinct email sending and response functions
- ✅ **Error Handling**: Comprehensive error handling throughout
- ✅ **Thread Support**: Proper email threading with References headers
- ✅ **Database Persistence**: SQLite storage for email history
- ✅ **Rate Limiting**: 1-second delays between emails (Resend 2 req/sec compliance)
- ✅ **Meeting Scheduling**: Automated multi-step meeting scheduling
  - Google Calendar integration for organizer availability
  - Multi-participant support with timezone handling
  - Priority-based participant weighting
  - Smart slot calculation with conflict resolution
  - Multi-timezone normalization
  - Availability collection workflow

## Usage

### Start the Application

```bash
npm start
```

The system will:
1. Poll emails every 60 seconds
2. Process new emails with AI analysis
3. Generate and send responses automatically
4. Handle meeting scheduling workflow
5. Send daily summaries at configured time

### Manual Commands

```bash
# Development mode with auto-restart
npm run dev

# Run database migration (add new columns to existing database)
npm run migrate
```

### Meeting Scheduling Workflow

When an email mentions a meeting:

**Step 1**: System fetches organizer's Google Calendar availability
**Step 2**: Sends available slots to organizer
**Step 3**: Organizer selects a date from email reply
**Step 4**: System asks participants for availability on that date
**Step 5**: Participants reply with time windows (e.g., "09:00 to 11:00")
**Step 6**: System calculates optimal meeting times using smart algorithm
**Step 7**: Sends top 3 options to organizer (timezone-aware, priority-weighted)

**Participant Format in Email:**
```
Participants:
Name, email@example.com, Timezone, Priority
John Doe, john@example.com, Asia/Kolkata, 5
Jane Smith, jane@example.com, America/New_York, 3
Bob Wilson, bob@example.com, Europe/London, 2
```

Priority: 1-10 (higher = more influence on final time selection)

See [MEETING_GUIDE.md](./MEETING_GUIDE.md) for detailed meeting workflow.
See [SLOT_ALGORITHM.md](./SLOT_ALGORITHM.md) for smart algorithm details.

## Environment Variables

Required in `.env` file:
- `REDIS_HOST` - Redis server hostname
- `GROQ_API_KEY` - Groq AI API key
- `RESEND_API_KEY` - Resend email service API key
- `CLIENT_ID` - Google OAuth client ID
- `CLIENT_SECRET` - Google OAuth client secret
