# COEP Email Assistant

A professional email processing assistant that analyzes incoming emails and generates thread summaries.

## Project Structure

```
main/
├── src/
│   ├── index.js                    # Application entry point
│   ├── database.js                 # Email storage and retrieval
│   ├── workers.js                  # Background job processors
│   └── services/
│       ├── ai-service.js          # AI-powered email analysis
│       └── email-sender.js        # Email sending service
├── utils/
│   ├── config.js                  # Configuration management
│   ├── logger.js                  # Professional logging utility
│   └── email-utils.js             # Email formatting utilities
├── package.json
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

## Running the Application

```bash
npm start
```

## Environment Variables

Required in `.env` file:
- `REDIS_HOST` - Redis server hostname
- `GROQ_API_KEY` - Groq AI API key
- `RESEND_API_KEY` - Resend email service API key
