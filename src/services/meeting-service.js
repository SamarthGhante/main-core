const { getDatesAndPhases } = require("../../utils/calendar-utils");
const meetingDb = require("../meeting-database");
const logger = require("../../utils/logger");

class MeetingService {
  formatAvailableSlots(slots) {
    if (!slots || slots.length === 0) {
      return "Unfortunately, no available slots were found in the next 3 days.";
    }

    let formatted = "Here are the available time slots for the meeting:\n\n";

    slots.forEach((slot, index) => {
      formatted += `${index + 1}. ${slot.date} (${slot.phase}) - ${slot.start_time} to ${slot.end_time}\n`;
    });

    formatted +=
      "\nPlease reply with the number of your preferred time slot (e.g., '1' or 'Option 2').";

    return formatted;
  }

  async getAvailableSlotsEmail(duration = 60, timezone = "Asia/Kolkata") {
    try {
      logger.info("Fetching available calendar slots");
      const slots = await getDatesAndPhases(duration, timezone);
      return {
        slots,
        message: this.formatAvailableSlots(slots),
      };
    } catch (error) {
      logger.error("Failed to get available slots", error);
      return {
        slots: [],
        message:
          "I encountered an error while checking the calendar. Please try again later.",
      };
    }
  }

  parseSlotSelection(text, availableSlots) {
    if (!availableSlots || availableSlots.length === 0) {
      return null;
    }

    const numberMatch = text.match(/\b(\d+)\b/);
    if (numberMatch) {
      const selectedIndex = parseInt(numberMatch[1]) - 1;
      if (selectedIndex >= 0 && selectedIndex < availableSlots.length) {
        return availableSlots[selectedIndex];
      }
    }

    const optionMatch = text.match(/option\s+(\d+)/i);
    if (optionMatch) {
      const selectedIndex = parseInt(optionMatch[1]) - 1;
      if (selectedIndex >= 0 && selectedIndex < availableSlots.length) {
        return availableSlots[selectedIndex];
      }
    }

    return null;
  }

  extractParticipants(text) {
    const participants = [];
    const lines = text.split("\n");

    for (const line of lines) {
      const emailMatch = line.match(
        /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]+)/
      );
      if (emailMatch) {
        const email = emailMatch[1];
        const nameMatch = line.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
        const timezoneMatch = line.match(
          /(Asia\/Kolkata|America\/New_York|Europe\/London|UTC[+-]\d+)/i
        );

        participants.push({
          name: nameMatch ? nameMatch[1] : email.split("@")[0],
          email: email,
          timezone: timezoneMatch ? timezoneMatch[1] : "Asia/Kolkata",
        });
      }
    }

    return participants;
  }

  formatMeetingInvite(selectedSlot, organizerName, participants) {
    let invite = `Meeting Confirmation\n\n`;
    invite += `The meeting has been scheduled for:\n`;
    invite += `Date: ${selectedSlot.date}\n`;
    invite += `Time: ${selectedSlot.start_time} - ${selectedSlot.end_time} (${selectedSlot.phase})\n\n`;

    if (organizerName) {
      invite += `Organizer: ${organizerName}\n`;
    }

    if (participants && participants.length > 0) {
      invite += `\nParticipants:\n`;
      participants.forEach((p) => {
        invite += `- ${p.name} (${p.email}) - ${p.timezone}\n`;
      });
    }

    invite += `\nLooking forward to seeing you there!`;

    return invite;
  }
}

module.exports = new MeetingService();
