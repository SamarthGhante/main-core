const getTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString("en-US", { hour12: false });
};

const logger = {
  info: (message) => {
    console.log(`[${getTimestamp()}] [INFO] ${message}`);
  },

  error: (message, error) => {
    const errorMsg = error ? `: ${error.message}` : "";
    console.error(`[${getTimestamp()}] [ERROR] ${message}${errorMsg}`);
  },

  success: (message) => {
    console.log(`[${getTimestamp()}] [SUCCESS] ${message}`);
  },

  startup: (message) => {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`  ${message}`);
    console.log(`${"=".repeat(50)}\n`);
  },
};

module.exports = logger;
