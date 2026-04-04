const { Resend } = require("resend");
const config = require("../../utils/config");
const logger = require("../../utils/logger");
const { wrapMessageId, buildReferences } = require("../../utils/email-utils");

class EmailSender {
  constructor() {
    this.client = new Resend(config.resend.apiKey);
  }

  async sendReply(to, subject, body, originalMessageId, references) {
    try {
      const wrappedId = wrapMessageId(originalMessageId);
      const finalReferences = buildReferences(references, originalMessageId);

      const { data, error } = await this.client.emails.send({
        from: config.resend.from,
        to: [to],
        subject: subject,
        text: body,
        headers: {
          "In-Reply-To": wrappedId,
          References: finalReferences,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      logger.success(`Email sent to ${to} (ID: ${data.id})`);
      
      // Add 1 second delay to respect rate limits (2 req/sec)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, id: data.id };
    } catch (error) {
      logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  async sendEmail(to, subject, body) {
    try {
      const { data, error } = await this.client.emails.send({
        from: config.resend.from,
        to: [to],
        subject: subject,
        text: body,
      });

      if (error) {
        throw new Error(error.message);
      }

      logger.success(`Email sent to ${to} (ID: ${data.id})`);
      
      // Add 1 second delay to respect rate limits (2 req/sec)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, id: data.id };
    } catch (error) {
      logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }
}

module.exports = new EmailSender();
