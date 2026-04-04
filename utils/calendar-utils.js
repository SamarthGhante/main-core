const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const logger = require("./logger");

const TOKEN_PATH = path.join(__dirname, "..", "tokens.json");

const PHASES = {
  morning: { start: 9, end: 12 },
  afternoon: { start: 12, end: 15 },
  evening: { start: 15, end: 18 },
};

async function authenticate() {
  try {
    const raw = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));

    const auth = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      "http://localhost"
    );

    const creds = {
      access_token: raw.token,
      refresh_token: raw.refresh_token,
      scope: Array.isArray(raw.scopes) ? raw.scopes.join(" ") : raw.scope,
      token_type: "Bearer",
      expiry_date: raw.expiry_date || undefined,
    };

    auth.setCredentials(creds);
    return google.calendar({ version: "v3", auth });
  } catch (error) {
    logger.error("Calendar authentication failed", error);
    throw error;
  }
}

function decimalHour(date) {
  return date.getHours() + date.getMinutes() / 60;
}

function hhmm(hour) {
  const h = Math.floor(hour);
  const m = Math.round((hour % 1) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hasFreeSlot(busy, duration, start, end) {
  const step = 0.5;
  const dur = duration / 60;
  let h = start;

  while (h + dur <= end) {
    const slotEnd = h + dur;
    const conflict = busy.some(
      ([bStart, bEnd]) => h < bEnd && slotEnd > bStart
    );

    if (!conflict) {
      return { start_time: hhmm(h), end_time: hhmm(slotEnd) };
    }

    h += step;
  }

  return null;
}

function next3Days() {
  const days = [];
  const today = new Date();

  for (let i = 1; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }

  return days;
}

async function getDatesAndPhases(duration = 60, timezone = "Asia/Kolkata") {
  try {
    const calendar = await authenticate();
    const dates = next3Days();

    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: `${dates[0]}T00:00:00Z`,
        timeMax: `${dates[2]}T23:59:59Z`,
        timeZone: timezone,
        items: [{ id: "primary" }],
      },
    });

    const busyAll = res.data.calendars.primary.busy;
    const slots = [];

    for (const date of dates) {
      const dayStart = new Date(`${date}T00:00:00Z`);
      const dayEnd = new Date(`${date}T23:59:59Z`);

      const dayBusy = busyAll
        .filter(
          (b) =>
            new Date(b.start) < dayEnd && new Date(b.end) > dayStart
        )
        .map((b) => [
          decimalHour(new Date(b.start)),
          decimalHour(new Date(b.end)),
        ]);

      for (const [phase, range] of Object.entries(PHASES)) {
        const slot = hasFreeSlot(dayBusy, duration, range.start, range.end);

        if (slot) {
          slots.push({
            date,
            phase,
            start_time: slot.start_time,
            end_time: slot.end_time,
          });
        }
      }
    }

    logger.info(`Found ${slots.length} available calendar slots`);
    return slots;
  } catch (error) {
    logger.error("Failed to fetch calendar availability", error);
    throw error;
  }
}

module.exports = { getDatesAndPhases };
