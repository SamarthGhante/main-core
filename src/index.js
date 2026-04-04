const logger = require("../utils/logger");
const database = require("./database");
const { startEmailProcessor, startEmailSender } = require("./workers");

logger.startup("COEP Email Assistant Started");

startEmailProcessor();
startEmailSender();

logger.info("All workers are running");

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
