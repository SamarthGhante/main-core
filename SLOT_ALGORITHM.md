# Smart Slot Calculation Algorithm

## Overview

The system uses a sophisticated algorithm to find optimal meeting times based on:
- ✅ Multi-timezone normalization
- ✅ Participant availability windows
- ✅ Priority-based weighting
- ✅ Conflict resolution
- ✅ Time-of-day preferences

## How It Works

### 1. Data Collection
After all participants respond with their availability, the system has:
- Each participant's timezone
- Their available time window (start - end)
- Their priority level (1-10)

### 2. Slot Generation
- Converts all availability windows to UTC
- Finds global time range (earliest start to latest end)
- Generates 1-hour slots with 30-minute intervals
- Only considers reasonable hours (6 AM - 9 PM UTC)

### 3. Hard Constraints
Each slot is validated against strict requirements:

**Must Pass:**
- ✅ Organizer MUST be available (ratio > 0)
- ✅ Majority of participants must be available (>50%)
- ✅ No unreasonable local times (7 AM - 10 PM for all)

**Rejected if:**
- ❌ Organizer unavailable → rejected
- ❌ Too many unavailable (>50%) → rejected
- ❌ Unreasonable hour for anyone → rejected

### 4. Scoring System

Each slot gets scored based on multiple factors:

**Availability Score:**
- Fully available (100% overlap): +3 points
- Partially available: +1 point
- Not available: -3 points

**Time-of-Day Score:**
- Business hours (9 AM - 6 PM): +1 point
- Outside business hours: -2 points
- Extended hours (8 AM - 8 PM): +1 point
- Outside extended: -2 points

**Priority Weighting:**
- Each participant's score is multiplied by their priority
- Higher priority = more influence on final score

**Example:**
```
Participant A (Priority 5):
  - Fully available: 3 points
  - Business hours: +1 point
  - Extended hours: +1 point
  - Total: 5 points × 5 priority = 25

Participant B (Priority 2):
  - Not available: -3 points
  - Outside hours: -2 - 2 = -4 points
  - Total: -7 points × 2 priority = -14

Slot Score: 25 + (-14) = 11
```

### 5. Diversity Filter

To provide meaningful choices:
- Top-scored slots are selected
- Minimum 60-minute gap between options
- Maximum 3 slots returned
- Ensures variety in time choices

## Output

### Terminal Display
```
======================================================================
OPTIMAL MEETING SLOTS CALCULATED
======================================================================
Date: 2026-04-07
Participants: 3

======================================================================

Option 1: Score 18.00
  UTC: 2026-04-07T14:00:00.000Z - 2026-04-07T15:00:00.000Z
  Time in each timezone:
    ✓ John (Asia/Kolkata): 19:30 (100% available)
    ✓ Jane (America/New_York): 10:00 (100% available)
    ✗ Bob (Europe/London): 15:00 (0% available)

Option 2: Score 12.50
  UTC: 2026-04-07T15:30:00.000Z - 2026-04-07T16:30:00.000Z
  Time in each timezone:
    ✓ John (Asia/Kolkata): 21:00 (50% available)
    ✓ Jane (America/New_York): 11:30 (100% available)
    ✓ Bob (Europe/London): 16:30 (100% available)

======================================================================
```

### Email to Organizer
```
Based on everyone's availability and priorities, here are the top meeting times:

Option 1: Score 18.0
  UTC: 14:00 - 15:00
  ✓ John (Asia/Kolkata): 19:30
  ✓ Jane (America/New_York): 10:00
  ✗ Bob (Europe/London): 15:00

Option 2: Score 12.5
  UTC: 15:30 - 16:30
  ✓ John (Asia/Kolkata): 21:00
  ✓ Jane (America/New_York): 11:30
  ✓ Bob (Europe/London): 16:30

Please reply with your preferred option (1, 2, or 3).
```

## Algorithm Strengths

### 1. Timezone-Aware
- All calculations in UTC
- Displays times in each participant's local timezone
- Prevents timezone confusion

### 2. Priority-Based
- High-priority participants have more influence
- Balances individual needs vs. group needs
- Fair weighting system

### 3. Conflict Resolution
- Handles partial overlaps gracefully
- Finds best compromise when full overlap impossible
- Rejects unreasonable solutions

### 4. Practical Constraints
- Respects work hours (not 3 AM meetings)
- Ensures organizer availability
- Requires majority participation

### 5. Diversity
- Provides multiple options
- Spaced-out time slots
- Gives flexibility to organizer

## Example Scenarios

### Scenario 1: Perfect Overlap
```
Participant A: 09:00-17:00 (Asia/Kolkata, Priority 5)
Participant B: 09:00-17:00 (America/New_York, Priority 3)

Result: Multiple high-scoring slots in overlapping window
```

### Scenario 2: No Overlap
```
Participant A: 09:00-11:00 (Asia/Kolkata, Priority 5)
Participant B: 20:00-22:00 (Asia/Kolkata, Priority 3)

Result: No slots found (organizer unavailable everywhere)
```

### Scenario 3: Partial Overlap
```
Participant A: 14:00-16:00 (Asia/Kolkata, Priority 5)
Participant B: 09:00-11:00 (America/New_York, Priority 3)
Participant C: 15:00-17:00 (Europe/London, Priority 2)

Result: Slots with partial availability, scored by overlap %
```

## Technical Implementation

**Library:** Luxon (timezone handling)

**Key Functions:**
- `generateSlots()` - Creates candidate slots
- `scoreSlot()` - Evaluates slot quality
- `overlapRatio()` - Calculates availability overlap
- `filterDiverse()` - Ensures variety in options

**Complexity:** O(n × m) where:
- n = number of time slots
- m = number of participants

## Future Enhancements

Potential additions:
- [ ] Meeting duration customization (30min, 2hrs, etc.)
- [ ] Recurring meeting support
- [ ] Break time preferences
- [ ] Location-based timezone detection
- [ ] Voting system for final selection
