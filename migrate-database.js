const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "emails.db");
const db = new Database(dbPath);

console.log("Starting database migration...\n");

try {
  // Check existing tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const tableNames = tables.map(t => t.name);
  
  console.log("Existing tables:", tableNames.join(", "));

  // Create meetings table if it doesn't exist
  if (!tableNames.includes("meetings")) {
    console.log("\nCreating meetings table...");
    db.exec(`
      CREATE TABLE meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id TEXT NOT NULL,
        organizer_email TEXT NOT NULL,
        organizer_name TEXT,
        status TEXT DEFAULT 'pending_selection',
        available_slots TEXT,
        selected_slot TEXT,
        participants TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Created meetings table");
  }

  // Create or update meeting_participants table
  if (!tableNames.includes("meeting_participants")) {
    console.log("\nCreating meeting_participants table...");
    db.exec(`
      CREATE TABLE meeting_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meeting_id INTEGER NOT NULL,
        name TEXT,
        email TEXT NOT NULL,
        timezone TEXT DEFAULT 'Asia/Kolkata',
        priority INTEGER DEFAULT 0,
        availability_start TEXT,
        availability_end TEXT,
        has_responded INTEGER DEFAULT 0,
        FOREIGN KEY (meeting_id) REFERENCES meetings (id)
      )
    `);
    console.log("✓ Created meeting_participants table");
  } else {
    // Table exists, add missing columns
    console.log("\nChecking meeting_participants schema...");
    const tableInfo = db.prepare("PRAGMA table_info(meeting_participants)").all();
    const existingColumns = tableInfo.map(col => col.name);

    const columnsToAdd = [
      { name: "priority", type: "INTEGER DEFAULT 0" },
      { name: "availability_start", type: "TEXT" },
      { name: "availability_end", type: "TEXT" },
      { name: "has_responded", type: "INTEGER DEFAULT 0" },
    ];

    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        console.log(`Adding column: ${col.name}...`);
        db.exec(`ALTER TABLE meeting_participants ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✓ Added ${col.name}`);
      } else {
        console.log(`✓ Column ${col.name} already exists`);
      }
    }
  }

  console.log("\n✅ Database migration completed successfully!");

  // Show final schema
  const updatedTableInfo = db.prepare("PRAGMA table_info(meeting_participants)").all();
  console.log("\nFinal meeting_participants schema:");
  updatedTableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

} catch (error) {
  console.error("❌ Migration failed:", error.message);
  process.exit(1);
} finally {
  db.close();
}
