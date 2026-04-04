const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const config = {
  redis: {
    host: process.env.REDIS_HOST || "redis-queue",
    port: 6379,
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: "openai/gpt-oss-120b",
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    from: "Assistant <ass1@nptel.pp.ua>",
  },
  database: {
    path: path.join(__dirname, "..", "emails.db"),
  },
  queues: {
    incoming: "incoming-emails",
    outgoing: "outgoing_emails",
  },
};

module.exports = config;
