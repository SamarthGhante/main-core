const logger = require("../utils/logger");
const database = require("./database");
const meetingDb = require("./meeting-database");
const { startEmailProcessor, startEmailSender } = require("./workers");

logger.startup("Astra Email Assistant");

startEmailProcessor();
startEmailSender();

logger.info("System is up and running");

process.on("SIGINT", () => {
  logger.info("Shutting down gracefully");
  database.close();
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", error);
  database.close();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled promise rejection", new Error(String(reason)));
});
