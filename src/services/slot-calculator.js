const { DateTime } = require("luxon");
const logger = require("../../utils/logger");

class SlotCalculator {
  // ============================================================
  // TIMEZONE UTILS
  // ============================================================

  toUTC(dateStr, timeStr, timezone) {
    return DateTime.fromISO(`${dateStr}T${timeStr}`, { zone: timezone }).toUTC();
  }

  toLocal(dtUTC, timezone) {
    return dtUTC.setZone(timezone);
  }

  // ============================================================
  // OVERLAP CALCULATION
  // ============================================================

  overlapRatio(slot, participant, date) {
    let totalOverlap = 0;
    const duration = slot.end.diff(slot.start, "seconds").seconds;

    if (!participant.availability_start || !participant.availability_end) {
      return 0;
    }

    const start = this.toUTC(date, participant.availability_start, participant.timezone);
    const end = this.toUTC(date, participant.availability_end, participant.timezone);

    const oStart = DateTime.max(slot.start, start);
    const oEnd = DateTime.min(slot.end, end);

    if (oEnd > oStart) {
      totalOverlap += oEnd.diff(oStart, "seconds").seconds;
    }

    return duration > 0 ? totalOverlap / duration : 0;
  }

  // ============================================================
  // SLOT GENERATION
  // ============================================================

  generateSlots(participants, date) {
    let windows = [];

    participants.forEach((p) => {
      if (p.availability_start && p.availability_end) {
        windows.push({
          start: this.toUTC(date, p.availability_start, p.timezone),
          end: this.toUTC(date, p.availability_end, p.timezone),
        });
      }
    });

    if (windows.length === 0) {
      logger.error("No availability windows found");
      return [];
    }

    const globalStart = DateTime.min(...windows.map((w) => w.start));
    const globalEnd = DateTime.max(...windows.map((w) => w.end));

    let slots = [];
    let current = globalStart;

    // Generate 1-hour slots with 30-minute steps
    while (current.plus({ hours: 1 }) <= globalEnd) {
      // Only consider reasonable hours (6 AM - 9 PM)
      if (current.hour >= 6 && current.hour <= 20) {
        slots.push({
          start: current,
          end: current.plus({ hours: 1 }),
        });
      }
      current = current.plus({ minutes: 30 });
    }

    return slots;
  }

  // ============================================================
  // SCORING
  // ============================================================

  scoreSlot(slot, participants, organizerEmail, date) {
    let unavailable = 0;

    // HARD CONSTRAINTS
    for (let p of participants) {
      const ratio = this.overlapRatio(slot, p, date);
      const local = this.toLocal(slot.start, p.timezone);

      // Organizer MUST be available
      if (p.email === organizerEmail && ratio === 0) {
        return null;
      }

      if (ratio === 0) unavailable++;

      // No unreasonable hours (7 AM - 10 PM local time)
      if (local.hour < 7 || local.hour > 22) {
        return null;
      }
    }

    // Majority must be available
    if (unavailable > participants.length / 2) {
      return null;
    }

    // SCORING
    let totalScore = 0;

    for (let p of participants) {
      const ratio = this.overlapRatio(slot, p, date);
      const local = this.toLocal(slot.start, p.timezone);

      let score = 0;

      // Availability scoring
      if (ratio === 1) score += 3; // Fully available
      else if (ratio > 0) score += 1; // Partially available
      else score -= 3; // Not available

      // Time of day scoring
      if (local.hour >= 9 && local.hour <= 18) score += 1; // Business hours
      else score -= 2; // Outside business hours

      // Extended reasonable hours
      if (local.hour >= 8 && local.hour <= 20) score += 1;
      else score -= 2;

      // Apply priority weighting
      totalScore += score * (p.priority || 1);
    }

    return totalScore;
  }

  // ============================================================
  // DIVERSITY FILTER
  // ============================================================

  filterDiverse(slots, minGap = 60) {
    let final = [];

    for (let s of slots) {
      if (final.length === 0) {
        final.push(s);
      } else {
        let tooClose = final.some(
          (f) => Math.abs(s.start.diff(f.start, "minutes").minutes) < minGap
        );
        if (!tooClose) final.push(s);
      }
      if (final.length === 3) break;
    }

    return final;
  }

  // ============================================================
  // MAIN FUNCTION
  // ============================================================

  generateTopSlots(participants, organizerEmail, date) {
    logger.info(`Generating optimal slots for ${participants.length} participants`);

    const slots = this.generateSlots(participants, date);

    if (slots.length === 0) {
      logger.error("No valid time slots generated");
      return [];
    }

    let scored = [];

    slots.forEach((slot) => {
      const score = this.scoreSlot(slot, participants, organizerEmail, date);
      if (score !== null) {
        scored.push({ ...slot, score });
      }
    });

    scored.sort((a, b) => b.score - a.score);

    const topSlots = this.filterDiverse(scored);

    logger.info(`Generated ${topSlots.length} optimal time slots`);
    return topSlots;
  }

  // ============================================================
  // FORMAT FOR DISPLAY
  // ============================================================

  formatSlotsForEmail(topSlots, participants) {
    if (!topSlots || topSlots.length === 0) {
      return "Unfortunately, no suitable time slots were found that work for the majority of participants.";
    }

    let message = "Based on everyone's availability and priorities, here are the top meeting times:\n\n";

    topSlots.forEach((slot, i) => {
      message += `Option ${i + 1}: Score ${slot.score.toFixed(1)}\n`;
      message += `  UTC: ${slot.start.toFormat("HH:mm")} - ${slot.end.toFormat("HH:mm")}\n`;

      // Show time in each participant's timezone
      participants.forEach((p) => {
        const local = this.toLocal(slot.start, p.timezone);
        const overlap = this.overlapRatio(slot, p, slot.start.toISODate());
        const available = overlap > 0 ? "✓" : "✗";
        message += `  ${available} ${p.name} (${p.timezone}): ${local.toFormat("HH:mm")}\n`;
      });
      message += "\n";
    });

    // Dynamic instruction based on number of options
    if (topSlots.length === 1) {
      message += "This is the best available option based on everyone's availability.";
    } else if (topSlots.length === 2) {
      message += "Please reply with your preferred option (1 or 2).";
    } else {
      message += "Please reply with your preferred option (1, 2, or 3).";
    }

    return message;
  }

  printSlotsToTerminal(topSlots, participants, date) {
    console.log(`\n${"=".repeat(70)}`);
    console.log("OPTIMAL MEETING SLOTS CALCULATED");
    console.log(`${"=".repeat(70)}`);
    console.log(`Date: ${date}`);
    console.log(`Participants: ${participants.length}`);
    console.log(`\n${"=".repeat(70)}\n`);

    if (!topSlots || topSlots.length === 0) {
      console.log("❌ No suitable slots found");
      console.log(`${"=".repeat(70)}\n`);
      return;
    }

    topSlots.forEach((slot, i) => {
      console.log(`Option ${i + 1}: Score ${slot.score.toFixed(2)}`);
      console.log(`  UTC: ${slot.start.toISO()} - ${slot.end.toISO()}`);
      console.log(`  Time in each timezone:`);

      participants.forEach((p) => {
        const local = this.toLocal(slot.start, p.timezone);
        const overlap = this.overlapRatio(slot, p, date);
        const available = overlap > 0 ? "✓" : "✗";
        const percent = (overlap * 100).toFixed(0);

        console.log(
          `    ${available} ${p.name.padEnd(20)} ${p.timezone.padEnd(20)} ${local.toFormat("HH:mm")} (${percent}% available)`
        );
      });
      console.log();
    });

    console.log(`${"=".repeat(70)}\n`);
  }
}

module.exports = new SlotCalculator();
