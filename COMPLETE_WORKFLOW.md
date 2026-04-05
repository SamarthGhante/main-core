# Complete Meeting Scheduling Workflow

## Overview

This document provides a complete end-to-end walkthrough of the meeting scheduling feature, from initial request to optimal time calculation.

## End-to-End Flow

### Phase 1: Meeting Request Detection

**Trigger**: User sends email mentioning "meeting" with participants

**Email Example:**
```
Subject: Team Sync Meeting

Hi,

I'd like to schedule a meeting with the following participants:

Participants:
John Doe, john@example.com, Asia/Kolkata, 5
Jane Smith, jane@example.com, America/New_York, 3
Bob Wilson, bob@example.com, Europe/London, 2

Please help schedule this.

Thanks,
Organizer
```

**System Actions:**
1. AI detects meeting request
2. Extracts participant details (name, email, timezone, priority)
3. Creates meeting record in database
4. Adds all participants to `meeting_participants` table
5. Fetches organizer's Google Calendar availability
6. Status: `pending_selection`

**Database State:**
```
meetings:
  id: 1
  thread_id: "abc-123"
  organizer_email: "organizer@example.com"
  status: "pending_selection"
  available_slots: [{date: "2026-04-07", phase: "morning", ...}, ...]
  
meeting_participants:
  {meeting_id: 1, name: "John Doe", email: "john@...", timezone: "Asia/Kolkata", priority: 5}
  {meeting_id: 1, name: "Jane Smith", email: "jane@...", timezone: "America/New_York", priority: 3}
  {meeting_id: 1, name: "Bob Wilson", email: "bob@...", timezone: "Europe/London", priority: 2}
```

**Email Sent to Organizer:**
```
Subject: Re: Team Sync Meeting

Here are the available time slots for the meeting:

1. 2026-04-07 (morning) - 09:00 to 10:00
2. 2026-04-07 (afternoon) - 13:00 to 14:00
3. 2026-04-07 (evening) - 15:00 to 16:00
4. 2026-04-08 (morning) - 09:00 to 10:00
5. 2026-04-08 (afternoon) - 12:00 to 13:00

Please reply with the number of your preferred time slot (e.g., '1' or 'Option 2').
```

---

### Phase 2: Slot Selection by Organizer

**Trigger**: Organizer replies with slot number

**Email Example:**
```
Subject: Re: Team Sync Meeting

I'll go with option 1.
```

**System Actions:**
1. Detects slot selection (AI or keyword matching)
2. Parses selected slot index (1-5)
3. Updates meeting record with selected slot
4. Status: `awaiting_responses`
5. Sends availability request to all participants (with 1-second delays)

**Database State:**
```
meetings:
  id: 1
  status: "awaiting_responses"
  selected_slot: {date: "2026-04-07", phase: "morning", start_time: "09:00", ...}
```

**Emails Sent to Participants:**

To john@example.com:
```
Subject: Availability Request: Team Sync Meeting

The organizer wants to schedule a meeting on 2026-04-07.

Please reply with your availability on this date using the format:
"Available from HH:MM to HH:MM"

For example:
- "Available from 09:00 to 11:00"
- "09:00 to 11:00"
- "09:00-11:00"

Your timezone: Asia/Kolkata
```

To jane@example.com (after 1 second):
```
Subject: Availability Request: Team Sync Meeting

The organizer wants to schedule a meeting on 2026-04-07.

Please reply with your availability on this date using the format:
"Available from HH:MM to HH:MM"

For example:
- "Available from 09:00 to 11:00"
- "09:00 to 11:00"
- "09:00-11:00"

Your timezone: America/New_York
```

To bob@example.com (after 2 seconds):
```
(Same format)

Your timezone: Europe/London
```

**Confirmation to Organizer:**
```
Subject: Re: Team Sync Meeting

Thanks! I've selected the time slot on 2026-04-07 (morning).

Availability requests have been sent to all participants. I'll calculate the optimal meeting time once everyone responds.
```

---

### Phase 3: Availability Collection

**Trigger**: Participants reply with time windows

**Email Examples:**

From john@example.com:
```
Subject: Re: Availability Request: Team Sync Meeting

I'm available from 14:00 to 16:00.
```

From jane@example.com:
```
Subject: Re: Availability Request: Team Sync Meeting

Available 09:00-11:00
```

From bob@example.com:
```
Subject: Re: Availability Request: Team Sync Meeting

Free from 15:00 to 17:00
```

**System Actions (per response):**
1. Detects sender is participant in awaiting meeting
2. Parses time window using regex
3. Updates participant record:
   - `availability_start`: "14:00"
   - `availability_end`: "16:00"
   - `has_responded`: 1
4. Prints to terminal immediately

**Terminal Output (per response):**
```
[07:30:15] [INFO] Processing email: "Re: Availability Request..." from john@example.com
[07:30:15] [INFO] Participant john@example.com availability updated: 14:00 - 16:00

[07:31:22] [INFO] Processing email: "Re: Availability Request..." from jane@example.com
[07:31:22] [INFO] Participant jane@example.com availability updated: 09:00 - 11:00

[07:32:45] [INFO] Processing email: "Re: Availability Request..." from bob@example.com
[07:32:45] [INFO] Participant bob@example.com availability updated: 15:00 - 17:00
```

**Database State (after all responses):**
```
meeting_participants:
  {meeting_id: 1, email: "john@...", availability_start: "14:00", availability_end: "16:00", has_responded: 1}
  {meeting_id: 1, email: "jane@...", availability_start: "09:00", availability_end: "11:00", has_responded: 1}
  {meeting_id: 1, email: "bob@...", availability_start: "15:00", availability_end: "17:00", has_responded: 1}
```

---

### Phase 4: Optimal Slot Calculation

**Trigger**: Last participant responds (all `has_responded = 1`)

**System Actions:**
1. Detects all participants have responded
2. Fetches all participant data with availability windows
3. Prints participant summary to terminal
4. Calls slot calculator with:
   - Participants array (with timezone, priority, availability)
   - Organizer email (for hard constraint)
   - Selected date
5. Algorithm calculates top 3 slots
6. Prints detailed slot breakdown to terminal
7. Sends optimal slots to organizer

**Terminal Output:**
```
[07:32:45] [SUCCESS] All participants have responded!

======================================================================
PARTICIPANT DATA COLLECTED
======================================================================
Meeting Date: 2026-04-07

Name                Email                           Timezone              Priority  Availability
──────────────────────────────────────────────────────────────────────────────────────────────────
John Doe            john@example.com                Asia/Kolkata          5         14:00 - 16:00
Jane Smith          jane@example.com                America/New_York      3         09:00 - 11:00
Bob Wilson          bob@example.com                 Europe/London         2         15:00 - 17:00

======================================================================

[07:32:45] [INFO] Calculating optimal meeting times...
[07:32:45] [INFO] Generating optimal slots for 3 participants
[07:32:45] [INFO] Generated 3 optimal time slots

======================================================================
OPTIMAL MEETING SLOTS CALCULATED
======================================================================
Date: 2026-04-07
Participants: 3

======================================================================

Option 1: Score 12.00
  UTC: 2026-04-07T08:30:00.000Z - 2026-04-07T09:30:00.000Z
  Time in each timezone:
    ✓ John Doe             Asia/Kolkata         14:00 (100% available)
    ✓ Jane Smith           America/New_York     04:30 (50% available)
    ✗ Bob Wilson           Europe/London        09:30 (0% available)

Option 2: Score 9.50
  UTC: 2026-04-07T09:00:00.000Z - 2026-04-07T10:00:00.000Z
  Time in each timezone:
    ✓ John Doe             Asia/Kolkata         14:30 (100% available)
    ✓ Jane Smith           America/New_York     05:00 (50% available)
    ✗ Bob Wilson           Europe/London        10:00 (0% available)

Option 3: Score 8.00
  UTC: 2026-04-07T09:30:00.000Z - 2026-04-07T10:30:00.000Z
  Time in each timezone:
    ✓ John Doe             Asia/Kolkata         15:00 (100% available)
    ✓ Jane Smith           America/New_York     05:30 (0% available)
    ✓ Bob Wilson           Europe/London        10:30 (50% available)

======================================================================

[07:32:46] [SUCCESS] Optimal slots sent to organizer
```

**Email Sent to Organizer:**
```
Subject: Optimal Meeting Times - Team Sync Meeting

Based on everyone's availability and priorities, here are the top meeting times:

Option 1: Score 12.0
  UTC: 08:30 - 09:30
  ✓ John Doe (Asia/Kolkata): 14:00
  ✓ Jane Smith (America/New_York): 04:30
  ✗ Bob Wilson (Europe/London): 09:30

Option 2: Score 9.5
  UTC: 09:00 - 10:00
  ✓ John Doe (Asia/Kolkata): 14:30
  ✓ Jane Smith (America/New_York): 05:00
  ✗ Bob Wilson (Europe/London): 10:00

Option 3: Score 8.0
  UTC: 09:30 - 10:30
  ✓ John Doe (Asia/Kolkata): 15:00
  ✓ Jane Smith (America/New_York): 05:30
  ✓ Bob Wilson (Europe/London): 10:30

Please reply with your preferred option (1, 2, or 3).
```

---

## Algorithm Highlights

### Hard Constraints
- ✅ Organizer MUST be available
- ✅ Majority of participants must be available
- ✅ No unreasonable hours (7 AM - 10 PM local time)

### Scoring
- Fully available: +3 points
- Partially available: +1 point
- Not available: -3 points
- Business hours bonus: +1 point
- Extended hours bonus: +1 point
- Multiplied by participant priority

### Output
- Maximum 3 diverse options
- 60-minute minimum gap between slots
- Sorted by total score (highest first)

---

## Next Steps (To Be Implemented)

### Phase 5: Final Selection
- Organizer replies with option number (1, 2, or 3)
- System updates meeting status to `confirmed`
- Sends final confirmation to all participants

### Phase 6: Calendar Creation (Optional)
- Create Google Calendar events
- Send calendar invites to all participants
- Include meeting details and location

---

## Files Involved

| File | Responsibility |
|------|----------------|
| `src/workers.js` | Main workflow orchestration |
| `src/services/meeting-service.js` | Participant parsing, email formatting |
| `src/services/slot-calculator.js` | Smart algorithm implementation |
| `src/meeting-database.js` | Data persistence and queries |
| `utils/calendar-utils.js` | Google Calendar API integration |
| `src/services/email-sender.js` | Email delivery with rate limiting |

---

## Key Features

✅ **Multi-timezone Support**: All times normalized to UTC internally
✅ **Priority Weighting**: Higher priority = more influence
✅ **Conflict Resolution**: Finds best compromise when perfect overlap impossible
✅ **Rate Limiting**: 1-second delays prevent API throttling
✅ **Thread Tracking**: Maintains email thread continuity
✅ **Fallback Lookup**: Uses organizer email if thread ID fails
✅ **Progressive Disclosure**: Shows detailed breakdown only in terminal
✅ **Professional Output**: Clean, readable emails and logs
