const Database = require("better-sqlite3");
const config = require("./utils/config");

const dbPath = config.database.path;

console.log("📦 Database Migration: Adding calendar event columns");
console.log("Database path:", dbPath);

const db = new Database(dbPath);

try {
  // Check if columns already exist
  const tableInfo = db.pragma("table_info(meetings)");
  const hasEventId = tableInfo.some((col) => col.name === "event_id");
  const hasMeetLink = tableInfo.some((col) => col.name === "meet_link");

  let migrationsRun = 0;

  if (!hasEventId) {
    console.log("🔧 Adding event_id column...");
    db.exec(`ALTER TABLE meetings ADD COLUMN event_id TEXT;`);
    migrationsRun++;
    console.log("✅ event_id column added");
  } else {
    console.log("✅ event_id column already exists");
  }

  if (!hasMeetLink) {
    console.log("🔧 Adding meet_link column...");
    db.exec(`ALTER TABLE meetings ADD COLUMN meet_link TEXT;`);
    migrationsRun++;
    console.log("✅ meet_link column added");
  } else {
    console.log("✅ meet_link column already exists");
  }

  if (migrationsRun === 0) {
    console.log("ℹ️  No migrations needed - all columns exist");
  }

  console.log("\n📊 Current meetings table schema:");
  const schema = db.pragma("table_info(meetings)");
  schema.forEach((col) => {
    console.log(`  - ${col.name} (${col.type})`);
  });

  console.log("\n✅ Migration complete!");
} catch (error) {
  console.error("❌ Migration failed:", error.message);
  process.exit(1);
} finally {
  db.close();
}
