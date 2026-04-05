const { Worker, Queue } = require("bullmq");
const Redis = require("ioredis");
const config = require("../utils/config");
const logger = require("../utils/logger");
const database = require("./database");
const meetingDb = require("./meeting-database");
const aiService = require("./services/ai-service");
const emailSender = require("./services/email-sender");
const meetingService = require("./services/meeting-service");
const slotCalculator = require("./services/slot-calculator");
const { scheduleMeeting } = require("../utils/scheduler-utils");
const { formatSubject, formatThreadHistory } = require("../utils/email-utils");

const connection = {
  host: config.redis.host,
  port: config.redis.port,
};

const outgoingQueue = new Queue(config.queues.outgoing, { connection });

const startEmailProcessor = () => {
  logger.info("Starting email processor worker");

  new Worker(
    config.queues.incoming,
    async (job) => {
      const { subject, from, text, messageId, inReplyTo, references } =
        job.data;

      logger.info(`Processing email: "${subject}" from ${from}`);

      database.storeEmail(messageId, inReplyTo, subject, from, text);

      try {
        const analysis = await aiService.analyzeEmail(from, text);

        // Check if this is from a participant in an awaiting meeting
        const participantEmail = from.match(/<([^>]+)>/)?.[1] || from;
        const participantMeeting = meetingDb.getMeetingByParticipantEmail(participantEmail);

        if (participantMeeting) {
          logger.info("Availability response from participant detected");
          
          const availability = meetingService.parseAvailabilityResponse(text);

          if (availability) {
            console.log(`\n${"-".repeat(50)}`);
            console.log(`PARTICIPANT AVAILABILITY RECEIVED`);
            console.log(`${"-".repeat(50)}`);
            console.log(`From: ${from}`);
            console.log(`Email: ${participantEmail}`);
            console.log(`Available: ${availability.start_time} - ${availability.end_time}`);
            console.log(`${"-".repeat(50)}\n`);

            meetingDb.updateParticipantAvailability(
              participantEmail,
              participantMeeting.id,
              availability.start_time,
              availability.end_time
            );

            await outgoingQueue.add("send-reply", {
              to: from,
              subject: formatSubject(subject, true),
              body: `Thank you! Your availability (${availability.start_time} - ${availability.end_time}) has been recorded.`,
              originalMessageId: messageId,
              references: references,
            });

            logger.info(`Availability recorded for ${participantEmail}`);

            // Check if all participants have responded
            const allResponded = meetingDb.checkAllParticipantsResponded(participantMeeting.id);

            if (allResponded) {
              logger.success("All participants have responded!");
              const participants = meetingDb.getParticipants(participantMeeting.id);
              meetingService.printParticipantData(participants, participantMeeting.selected_slot);

              // Calculate optimal time slots
              logger.info("Calculating optimal meeting times...");
              
              const meeting = meetingDb.getMeetingByThread(participantMeeting.thread_id);
              const organizerEmail = meeting.organizer_email;
              const selectedDate = participantMeeting.selected_slot.date;

              const topSlots = slotCalculator.generateTopSlots(
                participants,
                organizerEmail,
                selectedDate
              );

              slotCalculator.printSlotsToTerminal(topSlots, participants, selectedDate);

              if (topSlots.length === 0) {
                logger.error("No suitable time slots found for all participants");
                
                await outgoingQueue.add("send-email", {
                  to: organizerEmail,
                  subject: `Re: ${meeting.subject || 'Meeting Schedule'}`,
                  body: "Unfortunately, no suitable time slots could be found that work for the majority of participants. Please try selecting a different date.",
                });
                
                return;
              }

              // ============================================================
              // AUTO-SELECT BEST SLOT AND CREATE CALENDAR EVENT
              // ============================================================
              
              const bestSlot = topSlots[0];
              logger.info(`Selected best slot: ${bestSlot.start.toISO()}`);

              try {
                // Extract time components from DateTime object
                const startTime = bestSlot.start.toFormat('HH:mm');
                const endTime = bestSlot.end.toFormat('HH:mm');
                const date = bestSlot.start.toISODate();

                // Collect all participant emails
                const participantEmails = participants.map(p => p.email);

                // Create calendar event
                logger.info("Creating Google Calendar event...");
                const calendarResult = await scheduleMeeting(
                  date,
                  startTime,
                  endTime,
                  {
                    title: meeting.subject || "Meeting",
                    description: `Meeting scheduled by AI Assistant\n\nParticipants: ${participants.map(p => p.name).join(", ")}`,
                    participants: participantEmails,
                    timezone: organizerEmail.includes("@") ? "UTC" : "Asia/Kolkata",
                  }
                );

                logger.success("Calendar event created successfully");
                logger.info(`Event ID: ${calendarResult.event_id}`);
                logger.info(`Meet Link: ${calendarResult.meet_link}`);

                // ============================================================
                // SEND CONFIRMATIONS TO PARTICIPANTS
                // ============================================================

                logger.info("Sending confirmation emails to participants...");

                for (const participant of participants) {
                  const confirmationEmail = meetingService.formatParticipantConfirmation(
                    participant,
                    {
                      date: date,
                      start_time: startTime,
                      end_time: endTime,
                    },
                    calendarResult.meet_link,
                    calendarResult.calendar_link,
                    meeting.subject || "Meeting"
                  );

                  await outgoingQueue.add("send-email", {
                    to: participant.email,
                    subject: `Re: ${meeting.subject || 'Meeting'} - Confirmed!`,
                    body: confirmationEmail,
                  });

                  // 1 second delay between emails (Resend rate limit)
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }

                logger.success(`Confirmation emails sent to ${participants.length} participants`);

                // ============================================================
                // SEND DETAILED EXPLANATION TO ORGANIZER
                // ============================================================

                logger.info("Sending detailed explanation to organizer...");

                const organizerExplanation = meetingService.formatOrganizerExplanation(
                  topSlots,
                  {
                    date: date,
                    start_time: startTime,
                    end_time: endTime,
                    score: bestSlot.score,
                  },
                  participants,
                  calendarResult.meet_link,
                  calendarResult.calendar_link,
                  meeting.subject || "Meeting"
                );

                await outgoingQueue.add("send-email", {
                  to: organizerEmail,
                  subject: `Meeting Confirmed: ${meeting.subject || 'Meeting'}`,
                  body: organizerExplanation,
                });

                logger.success("Organizer explanation sent");

                // ============================================================
                // UPDATE MEETING STATUS
                // ============================================================

                logger.info("Updating meeting status to confirmed...");

                // Update meeting with event details
                meetingDb.db.prepare(`
                  UPDATE meetings 
                  SET status = 'confirmed', 
                      event_id = ?,
                      meet_link = ?,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?
                `).run(calendarResult.event_id, calendarResult.meet_link, meeting.id);

                logger.success("Meeting status updated to confirmed");

                // ============================================================
                // PRINT SUMMARY
                // ============================================================

                console.log(`\n${"=".repeat(70)}`);
                console.log("MEETING SUCCESSFULLY CREATED AND SCHEDULED");
                console.log(`${"=".repeat(70)}`);
                console.log(`\nEvent ID: ${calendarResult.event_id}`);
                console.log(`Meet Link: ${calendarResult.meet_link}`);
                console.log(`Calendar Link: ${calendarResult.calendar_link}`);
                console.log(`Date: ${date} at ${startTime} UTC`);
                console.log(`Participants: ${participants.map(p => `${p.name} (${p.timezone})`).join(", ")}`);
                console.log(`\n${"=".repeat(70)}\n`);

              } catch (error) {
                logger.error("Failed to create calendar event", error);
                logger.error(error.message);

                // Send error notification to organizer
                await outgoingQueue.add("send-email", {
                  to: organizerEmail,
                  subject: `Meeting Scheduling Error - ${meeting.subject || 'Meeting'}`,
                  body: `Unfortunately, the calendar event could not be created automatically.\n\nError: ${error.message}\n\nBest slot selected:\n${bestSlot.start.toISO()}\n\nPlease create the event manually or contact support.`,
                });
              }
            }
          } else {
            logger.info("Could not parse availability, printing raw response");
            
            console.log(`\n${"-".repeat(50)}`);
            console.log(`PARTICIPANT RESPONSE (UNPARSED)`);
            console.log(`${"-".repeat(50)}`);
            console.log(`From: ${from}`);
            console.log(`Email: ${participantEmail}`);
            console.log(`Message: ${text}`);
            console.log(`${"-".repeat(50)}\n`);

            await outgoingQueue.add("send-reply", {
              to: from,
              subject: formatSubject(subject, true),
              body: "I couldn't understand your availability. Please reply in format: 'Available from HH:MM to HH:MM' (e.g., 'Available from 09:00 to 11:00')",
              originalMessageId: messageId,
              references: references,
            });
          }
          
          return; // Exit early, this was a participant response
        }

        if (analysis.action === "summarize_thread") {
          logger.info("Summary requested, fetching thread history");

          const history = database.getThreadHistory(messageId, inReplyTo);
          const historyText = formatThreadHistory(history);

          const summary = await aiService.generateSummary(historyText);

          logger.info("Summary generated successfully");
          console.log(`\n${"-".repeat(50)}`);
          console.log("THREAD SUMMARY:");
          console.log(`${"-".repeat(50)}`);
          console.log(summary);
          console.log(`${"-".repeat(50)}\n`);

          await outgoingQueue.add("send-reply", {
            to: from,
            subject: formatSubject(subject, true),
            body: summary,
            originalMessageId: messageId,
            references: references,
          });

          logger.info("Summary queued for sending");
        } else if (analysis.action === "schedule_meeting") {
          logger.info("Meeting scheduling requested");

          const duration = analysis.params?.duration || 60;
          const { slots, message } =
            await meetingService.getAvailableSlotsEmail(duration);

          const threadId = inReplyTo || messageId;
          const organizerName = from.match(/^([^<]+)</)?.[1]?.trim() || null;
          const organizerEmail = from.match(/<([^>]+)>/)?.[1] || from;

          const meetingId = meetingDb.createMeeting(
            threadId,
            organizerEmail,
            organizerName,
            slots,
            subject  // Add subject here
          );

          const participants = meetingService.extractParticipants(text);
          if (participants.length > 0) {
            participants.forEach((p) => {
              meetingDb.addParticipant(meetingId, p.name, p.email, p.timezone, p.priority);
            });
            logger.info(`Added ${participants.length} participants to meeting`);
          }

          console.log(`\n${"-".repeat(50)}`);
          console.log("AVAILABLE MEETING SLOTS:");
          console.log(`${"-".repeat(50)}`);
          console.log(message);
          console.log(`${"-".repeat(50)}\n`);

          await outgoingQueue.add("send-reply", {
            to: from,
            subject: formatSubject(subject, true),
            body: message,
            originalMessageId: messageId,
            references: references,
          });

          logger.info("Meeting slots sent to organizer");
        } else if (analysis.action === "select_slot") {
          logger.info("Slot selection detected");

          const organizerEmail = from.match(/<([^>]+)>/)?.[1] || from;
          const threadId = inReplyTo || messageId;
          
          // Try to find meeting by thread first, then by organizer email
          let meeting = meetingDb.getMeetingByThread(threadId);
          
          if (!meeting) {
            logger.info(`No meeting found by thread, trying organizer email: ${organizerEmail}`);
            meeting = meetingDb.getMeetingByOrganizerEmail(organizerEmail);
          }

          if (!meeting) {
            logger.error("No meeting found for this thread or organizer");
            
            await outgoingQueue.add("send-reply", {
              to: from,
              subject: formatSubject(subject, true),
              body: "I couldn't find a pending meeting request. Please start a new meeting request if needed.",
              originalMessageId: messageId,
              references: references,
            });
            
            return;
          }

          const selectedSlot = meetingService.parseSlotSelection(
            text,
            meeting.available_slots
          );

          if (!selectedSlot) {
            logger.error("Could not parse slot selection");

            await outgoingQueue.add("send-reply", {
              to: from,
              subject: formatSubject(subject, true),
              body: "I couldn't identify your selected time slot. Please reply with the number of your preferred slot (e.g., '1' or 'Option 2').",
              originalMessageId: messageId,
              references: references,
            });

            return;
          }

          meetingDb.updateMeetingSlotById(meeting.id, selectedSlot);

          const organizerName = from.match(/^([^<]+)</)?.[1]?.trim() || null;
          const participants = meetingDb.getParticipants(meeting.id);

          const confirmationMsg = `Thank you! Your meeting date has been selected for ${selectedSlot.date} (${selectedSlot.phase}).\n\nI'm now asking all participants for their availability on this date.`;

          await outgoingQueue.add("send-reply", {
            to: from,
            subject: formatSubject(subject, true),
            body: confirmationMsg,
            originalMessageId: messageId,
            references: references,
          });

          logger.info("Confirmation sent to organizer");

          if (participants.length > 0) {
            const availabilityRequest = meetingService.formatAvailabilityRequest(
              selectedSlot,
              organizerName
            );

            for (const participant of participants) {
              await outgoingQueue.add("send-email", {
                to: participant.email,
                subject: `Availability Request: ${subject.replace("Re: ", "")}`,
                body: availabilityRequest,
              });
            }

            logger.info(
              `Availability requests sent to ${participants.length} participants`
            );
          }
        }
      } catch (error) {
        logger.error("Email processing failed", error);
      }
    },
    { connection }
  );
};

const startEmailSender = () => {
  logger.info("Starting email sender worker");

  new Worker(
    config.queues.outgoing,
    async (job) => {
      const { to, subject, body, originalMessageId, references } = job.data;

      try {
        if (originalMessageId) {
          await emailSender.sendReply(
            to,
            subject,
            body,
            originalMessageId,
            references
          );
        } else {
          await emailSender.sendEmail(to, subject, body);
        }
      } catch (error) {
        logger.error("Email sending failed", error);
      }
    },
    { connection }
  );
};

module.exports = {
  startEmailProcessor,
  startEmailSender,
};
