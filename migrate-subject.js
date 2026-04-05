const Database = require("better-sqlite3");
const config = require("./utils/config");

const dbPath = config.database.path;

console.log("📦 Database Migration: Adding subject column to meetings table");
console.log("Database path:", dbPath);

const db = new Database(dbPath);

try {
  // Check if column already exists
  const tableInfo = db.pragma("table_info(meetings)");
  const hasSubject = tableInfo.some((col) => col.name === "subject");

  if (hasSubject) {
    console.log("✅ Subject column already exists. No migration needed.");
  } else {
    console.log("🔧 Adding subject column...");
    db.exec(`ALTER TABLE meetings ADD COLUMN subject TEXT;`);
    console.log("✅ Subject column added successfully!");
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
