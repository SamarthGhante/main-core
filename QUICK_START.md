# Quick Start Guide

## Running the Application

### From the project root (recommended):
```bash
npm start
```

### With auto-reload during development:
```bash
npm run dev
```

### Manual run:
```bash
node src/index.js
```

## Important Notes

✅ **Always run from the `main/` directory** - This ensures:
- `.env` file is loaded correctly
- `emails.db` is created in the right location
- All paths resolve properly

❌ **Don't run from `src/` directory** - It will cause path resolution issues

## Project Structure

```
main/                      ← Run commands from here
├── src/                   ← Source code
│   ├── index.js          
│   ├── database.js       
│   ├── workers.js        
│   └── services/         
│       ├── ai-service.js 
│       └── email-sender.js
├── utils/                 ← Utilities
│   ├── config.js         ← Handles .env loading
│   ├── logger.js         
│   └── email-utils.js    
├── .env                   ← Environment variables
├── emails.db              ← Database (created here)
└── package.json
```

## Expected Output

```
[00:45:58] [INFO] Database initialized successfully

==================================================
  COEP Email Assistant Started
==================================================

[00:45:58] [INFO] Starting email processor worker
[00:45:58] [INFO] Starting email sender worker
[00:45:58] [INFO] All workers are running
```

## Environment Variables

Ensure `.env` contains:
- `REDIS_HOST`
- `GROQ_API_KEY`
- `RESEND_API_KEY`

## Graceful Shutdown

Press `Ctrl+C` to stop the application gracefully:
```
[00:46:23] [INFO] Shutting down gracefully
[00:46:23] [INFO] Database connection closed
```
