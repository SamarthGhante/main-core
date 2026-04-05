# Documentation Index

Complete documentation for the COEP Email Assistant project.

## Getting Started

📖 **[README.md](./README.md)**
- Project overview and architecture
- Module descriptions
- Environment setup
- Quick start guide

📖 **[QUICK_START.md](./QUICK_START.md)**
- Installation steps
- Configuration guide
- Running the application

## Meeting Scheduling

📖 **[MEETING_GUIDE.md](./MEETING_GUIDE.md)**
- Meeting scheduling feature overview
- Step-by-step usage guide
- Database schema
- Troubleshooting

📖 **[COMPLETE_WORKFLOW.md](./COMPLETE_WORKFLOW.md)**
- Complete end-to-end workflow walkthrough
- Phase-by-phase breakdown
- Email examples
- Terminal output examples
- Database state at each step

📖 **[SLOT_ALGORITHM.md](./SLOT_ALGORITHM.md)**
- Smart slot calculation algorithm details
- Scoring system explanation
- Hard constraints
- Example scenarios
- Technical implementation notes

📖 **[UPDATED_WORKFLOW.md](./UPDATED_WORKFLOW.md)**
- Workflow changes (availability collection)
- Migration guide
- Status flow diagram

## Implementation Details

📖 **[STRUCTURE.md](./STRUCTURE.md)**
- Detailed file structure
- Module responsibilities
- Data flow diagrams

📖 **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)**
- Technical implementation summary
- Key features
- Design decisions

## Maintenance

📖 **[QUICK_FIX_GUIDE.md](./QUICK_FIX_GUIDE.md)**
- Common issues and solutions
- Database migration guide
- Error troubleshooting

## Quick Reference

### Common Tasks

| Task | Command |
|------|---------|
| Start application | `npm start` |
| Development mode | `npm run dev` |
| Migrate database | `npm run migrate` |

### File Locations

| Component | File Path |
|-----------|-----------|
| Main entry | `src/index.js` |
| Email processing | `src/workers.js` |
| AI analysis | `src/services/ai-service.js` |
| Email sending | `src/services/email-sender.js` |
| Meeting logic | `src/services/meeting-service.js` |
| Slot calculator | `src/services/slot-calculator.js` |
| Email database | `src/database.js` |
| Meeting database | `src/meeting-database.js` |
| Calendar API | `utils/calendar-utils.js` |
| Configuration | `utils/config.js` |
| Logging | `utils/logger.js` |

### Database Tables

| Table | Purpose |
|-------|---------|
| `emails` | Email storage and threading |
| `meetings` | Meeting requests and status |
| `meeting_participants` | Participant details and availability |

### Meeting Status Flow

```
pending_selection → awaiting_responses → (confirmed)
       ↓                    ↓                 ↓
  Send slots      Collect availability   Final time
  to organizer    from participants      selected
```

### Environment Variables

Required in `.env`:
- `REDIS_HOST` - Redis server
- `GROQ_API_KEY` - Groq AI API
- `RESEND_API_KEY` - Resend email service
- `CLIENT_ID` - Google OAuth client
- `CLIENT_SECRET` - Google OAuth secret

### Participant Format

```
Name, email@example.com, Timezone, Priority

Examples:
John Doe, john@example.com, Asia/Kolkata, 5
Jane Smith, jane@example.com, America/New_York, 3
Bob Wilson, bob@example.com, Europe/London, 2
```

Priority: 1-10 (higher = more influence)

### Availability Format

Participants can respond with:
- "Available from 09:00 to 11:00"
- "09:00 to 11:00"
- "09:00-11:00"
- "I'm free 14:00 to 16:00"

All formats are automatically parsed.

## Getting Help

1. Check [QUICK_FIX_GUIDE.md](./QUICK_FIX_GUIDE.md) for common issues
2. Review [COMPLETE_WORKFLOW.md](./COMPLETE_WORKFLOW.md) for workflow understanding
3. See [SLOT_ALGORITHM.md](./SLOT_ALGORITHM.md) for algorithm details
4. Consult [MEETING_GUIDE.md](./MEETING_GUIDE.md) for meeting feature usage

## Implementation Checklist

Current Status:

- [x] Code refactoring and modularization
- [x] Professional logging system
- [x] Email sending and response separation
- [x] Meeting request detection
- [x] Google Calendar integration
- [x] Participant extraction with priority
- [x] Slot selection by organizer
- [x] Availability collection from participants
- [x] Rate limiting (1 sec between emails)
- [x] Smart slot calculation algorithm
- [x] Multi-timezone normalization
- [x] Priority-weighted scoring
- [x] Optimal slots sent to organizer
- [ ] Final slot selection by organizer
- [ ] Meeting confirmation to all participants
- [ ] Google Calendar event creation
- [ ] Testing and validation

## Contributing

When modifying the codebase:

1. Follow the modular architecture pattern
2. Use the logger utility for all output
3. Update relevant documentation
4. Test database migrations with `npm run migrate`
5. Respect rate limiting (1 sec between emails)
6. Maintain thread continuity in email responses

---

Last Updated: April 2026
