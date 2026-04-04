# Updated Meeting Scheduling Workflow

## New Features

### 1. Rate Limiting
✅ **1-second delay** between all emails to respect Resend's 2 req/sec limit

### 2. Participant Priority
Participants now include a **priority** field (integer):
```
- John Doe, john@example.com, Asia/Kolkata, 5
- Jane Smith, jane@example.com, America/New_York, 3
```

### 3. Availability Collection Workflow
Instead of directly confirming the meeting, the system now:
1. Organizer selects a date/time slot
2. System asks ALL participants for availability on that date
3. Participants respond with their available time ranges
4. Once all respond, system prints participant data array
5. Ready for next steps (finding common time)

## Complete Workflow

### Step 1: Meeting Request
```
Subject: Team Meeting

I'd like to schedule a meeting with:
- John Doe, john@example.com, Asia/Kolkata, 5
- Jane Smith, jane@example.com, America/New_York, 3
```

System responds with available slots.

### Step 2: Organizer Selects Slot
```
Subject: Re: Team Meeting

I'll go with option 2
```

System confirms and sends availability requests to participants.

### Step 3: Participants Provide Availability
**Email to each participant:**
```
Meeting Date Confirmation Request

The organizer would like to schedule a meeting on:

Date: 2026-04-06
Time Phase: afternoon

Please reply with your availability on this date in the following format:
Available from HH:MM to HH:MM

Example: "Available from 09:00 to 11:00" or "09:00-11:00"
```

**Participants reply:**
```
Available from 14:00 to 16:00
```

or

```
09:00 to 11:00
```

### Step 4: System Collects All Responses
Once all participants have responded, system prints:

```
======================================================================
ALL PARTICIPANTS HAVE RESPONDED - MEETING DATA
======================================================================

Selected Date: 2026-04-06
Selected Phase: afternoon

Participants Data:
----------------------------------------------------------------------

1. John Doe
   Email: john@example.com
   Timezone: Asia/Kolkata
   Priority: 5
   Availability: 14:00 - 16:00
   Responded: Yes

2. Jane Smith
   Email: jane@example.com
   Timezone: America/New_York
   Priority: 3
   Availability: 09:00 - 11:00
   Responded: Yes

======================================================================
```

## Database Schema Updates

### meeting_participants table
New fields:
- `priority` (INTEGER) - Participant priority level
- `availability_start` (TEXT) - Start time of availability
- `availability_end` (TEXT) - End time of availability
- `has_responded` (INTEGER) - Boolean flag for response status

### meetings table
Status values:
- `pending_selection` - Waiting for organizer to select slot
- `awaiting_responses` - Waiting for participant availability
- `confirmed` - Meeting finalized (future use)

## Participant Format

```
Name, email@example.com, Timezone, Priority
```

Examples:
```
- John Doe, john@example.com, Asia/Kolkata, 5
- Jane Smith, jane@example.com, America/New_York, 3
- Bob Johnson, bob@example.com, Europe/London, 1
```

Priority is optional (defaults to 0 if not specified).

## Supported Time Formats for Availability

Participants can reply with:
- `Available from 09:00 to 11:00`
- `09:00 to 11:00`
- `09:00-11:00`
- `9am to 11am` (basic support)

## Rate Limiting

✅ All email sending includes 1-second delay:
- Prevents "Too many requests" errors
- Ensures compliance with Resend limits
- Automatic in both `sendEmail()` and `sendReply()`

## Next Steps

After all participants respond:
1. System prints participant data to terminal
2. Can implement: Find overlapping availability
3. Can implement: Send final meeting time to all
4. Can implement: Create calendar events
