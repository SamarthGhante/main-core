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
              "You are a professional email assistant. Available tools: 'summarize_thread' for summaries, 'schedule_meeting' for meeting requests, 'select_slot' when user selects a time slot.",
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
          {
            type: "function",
            function: {
              name: "schedule_meeting",
              description:
                "User is requesting to schedule a meeting. Fetch available calendar slots.",
              parameters: {
                type: "object",
                properties: {
                  duration: {
                    type: "number",
                    description: "Meeting duration in minutes (default: 60)",
                  },
                },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "select_slot",
              description:
                "User is selecting a time slot from previously offered options.",
              parameters: {
                type: "object",
                properties: {},
              },
            },
          },
        ],
      });

      const message = response.choices[0].message;
      const toolCall = message.tool_calls?.[0];

      if (toolCall) {
        const functionName = toolCall.function.name;
        const args = toolCall.function.arguments
          ? JSON.parse(toolCall.function.arguments)
          : {};

        return {
          action: functionName,
          params: args,
          response: message.content,
        };
      }

      return {
        action: "none",
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
