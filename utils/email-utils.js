const wrapMessageId = (id) => {
  if (!id) return null;
  let clean = id.trim();
  if (!clean.startsWith("<")) clean = "<" + clean;
  if (!clean.endsWith(">")) clean = clean + ">";
  return clean;
};

const formatSubject = (subject, isReply = true) => {
  if (!isReply) return subject;
  return subject.startsWith("Re:") ? subject : `Re: ${subject}`;
};

const buildReferences = (references, messageId) => {
  const wrappedId = wrapMessageId(messageId);
  if (!references) return wrappedId;

  const cleanRefs = references
    .split(/\s+/)
    .map(wrapMessageId)
    .filter(Boolean)
    .join(" ");

  return `${cleanRefs} ${wrappedId}`.trim();
};

const formatThreadHistory = (history) => {
  return history
    .map((msg) => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      return `[${timestamp}] ${msg.sender}:\n${msg.body}`;
    })
    .join("\n\n" + "-".repeat(50) + "\n\n");
};

module.exports = {
  wrapMessageId,
  formatSubject,
  buildReferences,
  formatThreadHistory,
};
