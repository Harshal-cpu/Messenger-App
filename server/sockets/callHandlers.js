const Chat = require('../models/Chat');

/**
 * Registers WebRTC signaling events for voice/video calls and screen sharing.
 * This server never touches media streams — it only relays the small
 * signaling messages (SDP offers/answers, ICE candidates) so two peers'
 * browsers can establish a direct WebRTC connection.
 *
 * Flow for a 1:1 call:
 *   caller  -> 'callUser'      -> server relays 'incomingCall' to callee
 *   callee  -> 'answerCall'    -> server relays 'callAccepted' to caller
 *   both    -> 'iceCandidate'  -> server relays to the other peer
 *   either  -> 'endCall'       -> server relays 'callEnded' to the other peer
 */
function registerCallHandlers(io, socket) {
  // Initiate a call. payload: { chatId, toUserId, offer, callType: 'voice'|'video' }
  socket.on('callUser', async ({ chatId, toUserId, offer, callType }) => {
    const chat = await Chat.findOne({ _id: chatId, participants: socket.userId });
    if (!chat) return;

    io.to(`user:${toUserId}`).emit('incomingCall', {
      chatId,
      fromUserId: socket.userId,
      fromUser: { id: socket.user._id, name: socket.user.name, avatar: socket.user.avatar },
      offer,
      callType,
    });
  });

  // Callee accepts. payload: { toUserId, answer }
  socket.on('answerCall', ({ toUserId, answer }) => {
    io.to(`user:${toUserId}`).emit('callAccepted', {
      fromUserId: socket.userId,
      answer,
    });
  });

  // Callee declines. payload: { toUserId }
  socket.on('rejectCall', ({ toUserId }) => {
    io.to(`user:${toUserId}`).emit('callRejected', { fromUserId: socket.userId });
  });

  // Relay ICE candidates in both directions. payload: { toUserId, candidate }
  socket.on('iceCandidate', ({ toUserId, candidate }) => {
    io.to(`user:${toUserId}`).emit('iceCandidate', {
      fromUserId: socket.userId,
      candidate,
    });
  });

  // Either party ends an in-progress call. payload: { toUserId }
  socket.on('endCall', ({ toUserId }) => {
    io.to(`user:${toUserId}`).emit('callEnded', { fromUserId: socket.userId });
  });

  // Screen sharing renegotiation uses the same offer/answer dance on an
  // existing call, tagged so the client can distinguish it from a fresh call.
  socket.on('screenShareOffer', ({ toUserId, offer }) => {
    io.to(`user:${toUserId}`).emit('screenShareOffer', {
      fromUserId: socket.userId,
      offer,
    });
  });

  socket.on('screenShareAnswer', ({ toUserId, answer }) => {
    io.to(`user:${toUserId}`).emit('screenShareAnswer', {
      fromUserId: socket.userId,
      answer,
    });
  });
}

module.exports = registerCallHandlers;
