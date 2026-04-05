require("dotenv").config();

const { google } = require("googleapis");
const fs = require("fs");

const TOKEN_PATH = "tokens.json";

// authentication
async function authenticate() {
  const raw = JSON.parse(fs.readFileSync(TOKEN_PATH));

  const auth = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    "http://localhost"
  );

  // normalization
  const creds = {
    access_token: raw.token || raw.access_token,
    refresh_token: raw.refresh_token,
    scope: Array.isArray(raw.scopes)
      ? raw.scopes.join(" ")
      : raw.scope,
    token_type: "Bearer",
  };

  auth.setCredentials(creds);

  return google.calendar({ version: "v3", auth });
}

// Entry point
async function scheduleMeeting(date, start_time, end_time, meetingData = {}) {
  const calendar = await authenticate();

  const timezone = meetingData.timezone || "Asia/Kolkata";

  const event = {
    summary: meetingData.title || "Test Meeting",
    description: meetingData.description || "",
    start: {
      dateTime: `${date}T${start_time}:00`,
      timeZone: timezone,
    },
    end: {
      dateTime: `${date}T${end_time}:00`,
      timeZone: timezone,
    },
    attendees: (meetingData.participants || []).map(email => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
    conferenceDataVersion: 1,
    sendUpdates: "all",
  });

  const meetLink =
    res.data.conferenceData?.entryPoints?.find(
      e => e.entryPointType === "video"
    )?.uri || null;

  return {
    event_id: res.data.id,
    meet_link: meetLink,
    calendar_link: res.data.htmlLink,
  };
}

// Demo Run
if (require.main === module) {
  (async () => {
    try {
      console.log("\n⚠️ Using HARD-CODED test slot\n");

      const result = await scheduleMeeting(
        "2026-04-06",
        "10:00",
        "11:00",
        {
          title: "Standalone Test Meeting",
          participants: ["your-email@gmail.com"], 
        }
      );

      console.log("\n=== MEETING CREATED ===\n");
      console.log(result);

    } catch (err) {
      console.error("FULL ERROR:", err.response?.data || err.message);
    }
  })();
}

module.exports = { scheduleMeeting };
