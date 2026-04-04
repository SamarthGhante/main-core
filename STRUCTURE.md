# Project Structure

## Directory Layout

```
main/
│
├── src/                           # Application source code
│   ├── index.js                   # Entry point - starts workers
│   ├── database.js                # Email storage (SQLite)
│   ├── workers.js                 # BullMQ worker definitions
│   │
│   └── services/                  # Business logic services
│       ├── ai-service.js          # Groq AI integration
│       └── email-sender.js        # Resend email integration
│
├── utils/                         # Utility modules
│   ├── config.js                  # Environment config
│   ├── logger.js                  # Logging functions
│   └── email-utils.js             # Email formatting helpers
│
├── .env                           # Environment variables
├── package.json                   # Dependencies
├── emails.db                      # SQLite database
└── README.md                      # Documentation
```

## Module Dependencies

```
index.js
  ├─→ logger (utils)
  ├─→ database (src)
  └─→ workers (src)
        ├─→ config (utils)
        ├─→ logger (utils)
        ├─→ database (src)
        ├─→ email-utils (utils)
        ├─→ ai-service (src/services)
        └─→ email-sender (src/services)
              ├─→ config (utils)
              ├─→ logger (utils)
              └─→ email-utils (utils)
```

## Flow

1. **index.js** - Starts the application
2. **workers.js** - Sets up two workers:
   - Email Processor: Analyzes incoming emails
   - Email Sender: Sends outgoing emails
3. **ai-service.js** - Analyzes email content and generates summaries
4. **email-sender.js** - Sends emails with proper threading
5. **database.js** - Stores and retrieves email history
