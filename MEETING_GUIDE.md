# Meeting Scheduling Feature

## Overview

The email assistant now supports automated meeting scheduling with Google Calendar integration.

## Workflow

### 1. Meeting Request Detection
When an email mentions scheduling a meeting:
- AI detects the meeting request
- Fetches available slots from organizer's Google Calendar
- Sends available time slots to organizer

### 2. Slot Selection
When organizer replies with their choice:
- AI parses the selected slot
- Confirms the meeting with organizer
- Sends invites to all participants

### 3. Participant Notification
All participants receive:
- Meeting date and time
- Organizer details
- Their timezone information

## Email Format

### Meeting Request Email
```
Subject: Team Sync Meeting

Hi,

I'd like to schedule a meeting with the following participants:

- John Doe, john@example.com, Asia/Kolkata
- Jane Smith, jane@example.com, America/New_York
- Bob Johnson, bob@example.com, Europe/London

Please suggest some available times.
```

### Slot Selection Reply
```
Subject: Re: Team Sync Meeting

I'll go with option 2.
```

or

```
Subject: Re: Team Sync Meeting

Let's do 2
```

## Participant Format

Participants should be listed as:
```
Name, email@example.com, Timezone
```

Supported timezone examples:
- `Asia/Kolkata`
- `America/New_York`
- `Europe/London`
- `UTC+5:30`

## Database Schema

### meetings table
- `thread_id` - Email thread identifier
- `organizer_email` - Organizer's email
- `organizer_name` - Organizer's name
- `status` - `pending_selection` or `confirmed`
- `available_slots` - JSON array of available slots
- `selected_slot` - JSON object of chosen slot

### meeting_participants table
- `meeting_id` - Foreign key to meetings
- `name` - Participant name
- `email` - Participant email
- `timezone` - Participant timezone

## Calendar Configuration

### Required Files
1. `tokens.json` - Google OAuth tokens in project root
2. `.env` - Must contain:
   - `CLIENT_ID` - Google OAuth client ID
   - `CLIENT_SECRET` - Google OAuth client secret

### Token Format
```json
{
  "token": "ya29.xxx...",
  "refresh_token": "1//0gxxx...",
  "client_id": "xxx.apps.googleusercontent.com",
  "client_secret": "GOCSPX-xxx",
  "scopes": [
    "https://www.googleapis.com/auth/calendar"
  ]
}
```

## Features

- ✅ Google Calendar integration
- ✅ Automatic slot detection (morning, afternoon, evening)
- ✅ Next 3 days availability
- ✅ Multi-timezone support
- ✅ Participant extraction from email
- ✅ Automatic meeting invites
- ✅ Thread-based tracking
- ✅ Plain text responses

## Slot Phases

- **Morning**: 9:00 AM - 12:00 PM
- **Afternoon**: 12:00 PM - 3:00 PM
- **Evening**: 3:00 PM - 6:00 PM

Each phase is checked for availability in the next 3 days.
