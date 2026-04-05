# Calendar Creation Workflow - Complete Integration

## Overview

After participants respond with their availability, the system now:
1. ✅ Calculates optimal meeting times using the smart algorithm
2. ✅ **Automatically selects the best slot** (highest score)
3. ✅ **Creates Google Calendar event** with all participants
4. ✅ **Generates Google Meet link** automatically
5. ✅ **Sends confirmation emails** to all participants
6. ✅ **Sends detailed explanation** to organizer
7. ✅ **Updates meeting status** to "confirmed"

## Flow Diagram

```
All Participants Respond
         ↓
Calculate Optimal Slots (with smart algorithm)
         ↓
Select Best Slot (highest score)
         ↓
Create Google Calendar Event
         ↓
Generate Google Meet Link
         ↓
Send Confirmation Emails to Participants
         ↓
Send Detailed Explanation to Organizer
         ↓
Update Meeting Status to "confirmed"
```

## Step-by-Step Execution

### Phase 1: Slot Calculation
**Input:** Participant availability data
**Process:**
- Converts all times to UTC for normalized comparison
- Checks local hour for EACH timezone (not UTC hour!)
- Generates 1-hour slots with 30-minute intervals
- Scores each slot based on:
  - Availability overlap (1=100% match, -3=unavailable)
  - Time-of-day preferences (core hours +2, extended +1, outside -2)
  - Priority weighting (higher priority = more influence)
- Filters diverse options (90-minute minimum gap)
- Returns top 3 slots sorted by score

**Output:** `topSlots` array with highest-scoring slot first

### Phase 2: Calendar Event Creation
**Input:** Best slot (topSlots[0])
**Process:**
- Extracts date, start time, end time from DateTime object
- Calls `scheduleMeeting()` with:
  - Date: "2026-04-07"
  - Start time: "14:00"
  - End time: "15:00"
  - Meeting data (title, participants, timezone)
- Google API creates event with:
  - All participants as attendees
  - Automatic Google Meet link
  - Meeting description with participant list
  - Calendar invites sent to all attendees

**Output:**
```javascript
{
  event_id: "abc123xyz...",
  meet_link: "https://meet.google.com/...",
  calendar_link: "https://calendar.google.com/..."
}
```

### Phase 3: Participant Confirmations
**Input:** Each participant + calendar details
**Process:**
- Formats confirmation email for each participant
- Shows meeting time in THEIR local timezone
- Includes Google Meet link
- 1-second delay between emails (Resend rate limit)

**Email Example:**
```
Subject: Re: Meeting Schedule - Confirmed!

Hello Alice,

The meeting "Q2 Planning" has been scheduled!

Meeting Details:
- Date: 2026-04-07
- Time: 14:00 (Asia/Kolkata)
- Duration: 1 hour

Your availability and priority were considered in selecting this time slot.

Google Meet Link: https://meet.google.com/xyz-abc-def
Calendar Event: https://calendar.google.com/...

This meeting has been automatically added to your Google Calendar.

Thank you!
```

### Phase 4: Organizer Explanation
**Input:** All slots, selected slot, participants, calendar details
**Process:**
- Shows the selected slot prominently (highest score)
- Lists time for each participant in their timezone
- Explains WHY this slot was chosen:
  - Highest score from algorithm
  - Availability overlap percentage
  - Priority-weighted scoring
  - Timezone fairness
- Shows alternative options that were considered
- Includes Google Meet link

**Email Example:**
```
Subject: Meeting Confirmed: Q2 Planning

Meeting Scheduled: Q2 Planning

======================================================================

The optimal meeting time has been automatically selected and scheduled.

SELECTED SLOT:
----------------------------------------------------------------------
Date: 2026-04-07
Score: 15.5 (highest)

Time for each participant:
  • Alice (Asia/Kolkata): 14:00 - Fully available
  • Bob (America/New_York): 04:30 - Partially available

Google Meet Link: https://meet.google.com/xyz-abc-def
Calendar Event: https://calendar.google.com/...

----------------------------------------------------------------------
OTHER OPTIONS CONSIDERED:

Option 2: Score 13.0
  • Alice (Asia/Kolkata): 15:00
  • Bob (America/New_York): 05:30

Option 3: Score 10.5
  • Alice (Asia/Kolkata): 16:00
  • Bob (America/New_York): 06:30

----------------------------------------------------------------------
WHY THIS SLOT WAS CHOSEN:

The selected slot had the highest score (15.5) based on:
  • Participant availability overlap
  • Priority weighting (higher priority = more influence)
  • Time-of-day preferences (business hours preferred)
  • Timezone fairness (reasonable local times for all)

All participants have been notified and the meeting is on their calendars.
```

### Phase 5: Status Update
**Process:**
- Updates meeting status to "confirmed"
- Stores event_id for future reference
- Stores meet_link in database
- Sets updated_at timestamp

**Database Update:**
```sql
UPDATE meetings 
SET status = 'confirmed',
    event_id = 'abc123xyz...',
    meet_link = 'https://meet.google.com/...',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1
```

## Terminal Output

When calendar event is created successfully:

```
[HH:MM:SS] [INFO] Calculating optimal meeting times...
[HH:MM:SS] [INFO] Selected best slot: 2026-04-07T18:00:00.000Z
[HH:MM:SS] [INFO] Creating Google Calendar event...
[HH:MM:SS] [SUCCESS] Calendar event created successfully
[HH:MM:SS] [INFO] Event ID: 7a8b9c0d1e2f3g4h5i6j
[HH:MM:SS] [INFO] Meet Link: https://meet.google.com/abc-def-ghi
[HH:MM:SS] [INFO] Sending confirmation emails to participants...
[HH:MM:SS] [SUCCESS] Confirmation emails sent to 2 participants
[HH:MM:SS] [INFO] Sending detailed explanation to organizer...
[HH:MM:SS] [SUCCESS] Organizer explanation sent
[HH:MM:SS] [INFO] Updating meeting status to confirmed...
[HH:MM:SS] [SUCCESS] Meeting status updated to confirmed

======================================================================
MEETING SUCCESSFULLY CREATED AND SCHEDULED
======================================================================

Event ID: 7a8b9c0d1e2f3g4h5i6j
Meet Link: https://meet.google.com/abc-def-ghi
Calendar Link: https://calendar.google.com/...
Date: 2026-04-07 at 14:00 UTC
Participants: Alice (Asia/Kolkata), Bob (America/New_York)

======================================================================
```

## Error Handling

If calendar creation fails:
- Logs detailed error message
- Sends error notification to organizer
- Includes best selected slot in error email
- Provides manual fallback instructions

```
Subject: Meeting Scheduling Error - Q2 Planning

Unfortunately, the calendar event could not be created automatically.

Error: [Error details]

Best slot selected:
2026-04-07T18:00:00.000Z

Please create the event manually or contact support.
```

## Database Schema

### Meetings Table
```sql
CREATE TABLE meetings (
  id INTEGER PRIMARY KEY,
  thread_id TEXT,
  organizer_email TEXT,
  organizer_name TEXT,
  subject TEXT,
  status TEXT,                    -- pending_selection → awaiting_responses → confirmed
  available_slots TEXT (JSON),
  selected_slot TEXT (JSON),
  participants TEXT (JSON),
  event_id TEXT,                  -- ✨ NEW: Google Calendar event ID
  meet_link TEXT,                 -- ✨ NEW: Google Meet link
  created_at DATETIME,
  updated_at DATETIME
);
```

## Setup & Migration

### Run all migrations:
```bash
npm run migrate:all
```

Or individually:
```bash
npm run migrate           # Participant priority columns
npm run migrate:subject   # Meeting subject column
npm run migrate:calendar  # Event ID and Meet link columns
```

### Required Environment Variables:
```
CLIENT_ID=your_google_oauth_client_id
CLIENT_SECRET=your_google_oauth_client_secret
```

### Required Files:
```
tokens.json  (Google OAuth refresh token)
```

## Key Features

✅ **Fully Automatic:** No manual slot selection needed
✅ **Multi-Timezone:** All times normalized and converted
✅ **Priority-Aware:** High-priority participants' times preferred
✅ **Google Meet Integration:** Video link auto-generated
✅ **Rate Limited:** 1-second delays between emails
✅ **Error Resilient:** Graceful fallback if calendar creation fails
✅ **Detailed Explanations:** Organizer gets full breakdown
✅ **Professional Emails:** Clean formatting, timezone-aware times

## Testing

### Test Email:
```
Subject: Team Sync - Q2 Planning

Hi,

Please schedule a team sync meeting for Q2 planning.

Participants:
Alice, alice@example.com, Asia/Kolkata, 5
Bob, bob@example.com, America/New_York, 3

Duration: 60 minutes

Thanks!
```

### Expected Flow:
1. ✅ System fetches calendar slots
2. ✅ You select a date
3. ✅ Participants reply with availability
4. ✅ System automatically creates calendar event
5. ✅ Everyone gets confirmation email with Meet link
6. ✅ You get detailed explanation of why slot was chosen

## Next Steps

Potential enhancements:
- [ ] Recurring meeting support
- [ ] Custom meeting duration
- [ ] Room/location booking
- [ ] Conflict resolution for overlapping meetings
- [ ] Ical integration
- [ ] Meeting reminder emails

---

**Version:** 1.0
**Last Updated:** April 5, 2026
**Status:** Ready for Production
