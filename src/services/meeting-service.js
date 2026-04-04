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
        const priorityMatch = line.match(/priority[\s:]+(\d+)/i) || line.match(/,\s*(\d+)\s*$/);

        participants.push({
          name: nameMatch ? nameMatch[1] : email.split("@")[0],
          email: email,
          timezone: timezoneMatch ? timezoneMatch[1] : "Asia/Kolkata",
          priority: priorityMatch ? parseInt(priorityMatch[1]) : 0,
        });
      }
    }

    return participants;
  }

  formatAvailabilityRequest(selectedSlot, organizerName) {
    let message = `Meeting Date Confirmation Request\n\n`;
    message += `${organizerName || 'The organizer'} would like to schedule a meeting on:\n\n`;
    message += `Date: ${selectedSlot.date}\n`;
    message += `Time Phase: ${selectedSlot.phase}\n\n`;
    message += `Please reply with your availability on this date in the following format:\n`;
    message += `Available from HH:MM to HH:MM\n\n`;
    message += `Example: "Available from 09:00 to 11:00" or "09:00-11:00"\n\n`;
    message += `We will finalize the meeting time once everyone has responded.`;

    return message;
  }

  parseAvailabilityResponse(text) {
    // Match formats like:
    // "Available from 09:00 to 11:00"
    // "09:00 to 11:00"
    // "09:00-11:00"
    // "9am to 11am"
    
    const patterns = [
      /(?:from\s+)?(\d{1,2}:\d{2})\s*(?:to|-)\s*(\d{1,2}:\d{2})/i,
      /(\d{1,2})\s*(?:am|pm)\s*(?:to|-)\s*(\d{1,2})\s*(?:am|pm)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          start_time: this.normalizeTime(match[1]),
          end_time: this.normalizeTime(match[2]),
        };
      }
    }

    return null;
  }

  normalizeTime(time) {
    // Convert time to HH:MM format
    if (time.includes(':')) {
      const [h, m] = time.split(':');
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    }
    // Handle am/pm format
    return time;
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
        const availText = p.availability_start && p.availability_end 
          ? ` (Available: ${p.availability_start} - ${p.availability_end})`
          : '';
        invite += `- ${p.name} (${p.email}) - ${p.timezone} - Priority: ${p.priority || 0}${availText}\n`;
      });
    }

    invite += `\nLooking forward to seeing you there!`;

    return invite;
  }

  printParticipantData(participants, selectedSlot) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`ALL PARTICIPANTS HAVE RESPONDED - MEETING DATA`);
    console.log(`${"=".repeat(70)}`);
    console.log(`\nSelected Date: ${selectedSlot.date}`);
    console.log(`Selected Phase: ${selectedSlot.phase}\n`);
    console.log(`Participants Data:`);
    console.log(`${"-".repeat(70)}`);
    
    participants.forEach((p, idx) => {
      console.log(`\n${idx + 1}. ${p.name}`);
      console.log(`   Email: ${p.email}`);
      console.log(`   Timezone: ${p.timezone}`);
      console.log(`   Priority: ${p.priority || 0}`);
      console.log(`   Availability: ${p.availability_start || 'N/A'} - ${p.availability_end || 'N/A'}`);
      console.log(`   Responded: ${p.has_responded ? 'Yes' : 'No'}`);
    });
    
    console.log(`\n${"=".repeat(70)}\n`);
  }
}

module.exports = new MeetingService();
