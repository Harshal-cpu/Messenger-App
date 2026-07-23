/**
 * Extracts @mentions from message content by matching against a chat's
 * participants' first names. This is a pragmatic approach for a project
 * without a dedicated unique-username system — for group chats especially,
 * "@Jane" resolves to whichever participant's name starts with "Jane"
 * (case-insensitive), skipping the sender themselves.
 *
 * @param {string} content
 * @param {Array<{_id: any, name: string}>} participants
 * @param {string} senderId
 * @returns {string[]} array of mentioned user id strings (deduplicated)
 */
function extractMentions(content, participants, senderId) {
  if (!content) return [];

  const mentionPattern = /@(\w+)/g;
  const matches = [...content.matchAll(mentionPattern)].map((m) => m[1].toLowerCase());
  if (matches.length === 0) return [];

  const mentionedIds = new Set();

  participants.forEach((participant) => {
    const id = (participant._id || participant).toString();
    if (id === senderId?.toString()) return; // don't notify yourself

    const firstName = (participant.name || '').split(' ')[0].toLowerCase();
    if (firstName && matches.includes(firstName)) {
      mentionedIds.add(id);
    }
  });

  return [...mentionedIds];
}

module.exports = extractMentions;
