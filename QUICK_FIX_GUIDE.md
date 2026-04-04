# Quick Fix Guide

## Database Migration Issue - RESOLVED ✅

### Problem
```
[ERROR] Failed to get participants: no such column: priority
```

### Cause
The database schema was not updated with new columns for the priority and availability features.

### Solution
Run the migration script:
```bash
npm run migrate
```

This adds the missing columns to your existing database:
- `priority` (INTEGER)
- `availability_start` (TEXT)
- `availability_end` (TEXT)
- `has_responded` (INTEGER)

### Verification
After migration, you should see:
```
✅ Database migration completed successfully!

Final meeting_participants schema:
  - id (INTEGER)
  - meeting_id (INTEGER)
  - name (TEXT)
  - email (TEXT)
  - timezone (TEXT)
  - priority (INTEGER)
  - availability_start (TEXT)
  - availability_end (TEXT)
  - has_responded (INTEGER)
```

## Migration Script

**File:** `migrate-database.js`

**Features:**
- ✅ Safe to run multiple times (idempotent)
- ✅ Checks existing schema before adding columns
- ✅ Shows detailed progress
- ✅ Displays final schema

**Usage:**
```bash
# Run migration
npm run migrate

# Or directly with node
node migrate-database.js
```

## Restart After Migration

After running the migration:

1. **Stop** the application (if running): `Ctrl+C`
2. **Restart** the application: `npm start`
3. **Test** with a new meeting request

## Testing the Fix

Send a meeting request with priority:

```
Subject: Team Meeting

I'd like to schedule a meeting with:
- John Doe, john@example.com, Asia/Kolkata, 5
- Jane Smith, jane@example.com, America/New_York, 3
```

Expected behavior:
- ✅ No "no such column: priority" error
- ✅ Participants stored with priority values
- ✅ Sorted by priority in output
- ✅ Availability tracking works

## Future Database Changes

If you need to make database schema changes in the future:

1. Edit `src/meeting-database.js` schema
2. Update `migrate-database.js` to add new columns
3. Run `npm run migrate`
4. Restart the application

The migration script is designed to be extended with new columns as needed.
