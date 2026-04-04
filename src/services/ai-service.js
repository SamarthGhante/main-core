const { Groq } = require("groq-sdk");
const config = require("../../utils/config");
const logger = require("../../utils/logger");

class AIService {
  constructor() {
    this.client = new Groq({ apiKey: config.groq.apiKey });
  }

  async analyzeEmail(from, text) {
    try {
      const response = await this.client.chat.completions.create({
        model: config.groq.model,
        messages: [
          {
            role: "system",
            content:
              "You are a professional email assistant. If the user asks for a summary, call the 'summarize_thread' tool.",
          },
          {
            role: "user",
            content: `From: ${from}\nContent: ${text}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "summarize_thread",
              description:
                "Retrieves email thread history and generates a concise summary.",
              parameters: {
                type: "object",
                properties: {},
              },
            },
          },
        ],
      });

      const message = response.choices[0].message;
      const needsSummary =
        message.tool_calls?.[0]?.function?.name === "summarize_thread";

      return {
        needsSummary,
        response: message.content,
      };
    } catch (error) {
      logger.error("AI analysis failed", error);
      throw error;
    }
  }

  async generateSummary(threadHistory) {
    try {
      const response = await this.client.chat.completions.create({
        model: config.groq.model,
        messages: [
          {
            role: "system",
            content:
              "You are a professional email assistant. Generate a clear, concise summary of the email thread. Use plain text only - no markdown, no formatting, no special characters. Be professional and factual.",
          },
          {
            role: "user",
            content: threadHistory,
          },
        ],
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error("Summary generation failed", error);
      throw error;
    }
  }
}

module.exports = new AIService();
