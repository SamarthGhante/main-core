const { Worker, Queue } = require("bullmq");
const Redis = require("ioredis");
const config = require("../utils/config");
const logger = require("../utils/logger");
const database = require("./database");
const aiService = require("./services/ai-service");
const emailSender = require("./services/email-sender");
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

        if (analysis.needsSummary) {
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
        await emailSender.sendReply(
          to,
          subject,
          body,
          originalMessageId,
          references
        );
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
