const { Worker, Queue } = require("bullmq");
const Redis = require("ioredis");
const config = require("../utils/config");
const logger = require("../utils/logger");
const database = require("./database");
const meetingDb = require("./meeting-database");
const aiService = require("./services/ai-service");
const emailSender = require("./services/email-sender");
const meetingService = require("./services/meeting-service");
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
            slots
          );

          const participants = meetingService.extractParticipants(text);
          if (participants.length > 0) {
            participants.forEach((p) => {
              meetingDb.addParticipant(meetingId, p.name, p.email, p.timezone);
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

          const threadId = inReplyTo || messageId;
          const meeting = meetingDb.getMeetingByThread(threadId);

          if (!meeting) {
            logger.error("No meeting found for this thread");
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

          meetingDb.updateMeetingSlot(threadId, selectedSlot);

          const organizerEmail = from.match(/<([^>]+)>/)?.[1] || from;
          const organizerName = from.match(/^([^<]+)</)?.[1]?.trim() || null;
          const participants = meetingDb.getParticipants(meeting.id);

          const confirmationMsg = `Thank you! Your meeting has been confirmed for ${selectedSlot.date} at ${selectedSlot.start_time} - ${selectedSlot.end_time}.`;

          await outgoingQueue.add("send-reply", {
            to: from,
            subject: formatSubject(subject, true),
            body: confirmationMsg,
            originalMessageId: messageId,
            references: references,
          });

          logger.info("Confirmation sent to organizer");

          if (participants.length > 0) {
            const inviteMsg = meetingService.formatMeetingInvite(
              selectedSlot,
              organizerName,
              participants
            );

            for (const participant of participants) {
              await outgoingQueue.add("send-email", {
                to: participant.email,
                subject: `Meeting Invitation: ${subject.replace("Re: ", "")}`,
                body: inviteMsg,
              });
            }

            logger.info(
              `Meeting invites sent to ${participants.length} participants`
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
