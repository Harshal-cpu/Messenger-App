// Maps userId -> Set of active socket ids (a user can have multiple
// tabs/devices connected at once). Kept in its own module (rather than
// inside sockets/index.js) so other modules — like utils/notify.js, which
// needs to check "is this user currently online" — can import it without
// creating a circular require (sockets/index.js already imports the chat
// handlers, which import notify.js).
const onlineUsers = new Map();

module.exports = onlineUsers;
