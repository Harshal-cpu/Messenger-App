import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export default function CallModal({ chat, callType, incomingCall, onClose }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const [status, setStatus] = useState(incomingCall ? 'incoming' : 'calling');

  const otherUserId = incomingCall
    ? incomingCall.fromUserId
    : chat.participants.find((p) => p._id !== user._id)?._id;

  useEffect(() => {
    if (!socket) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('iceCandidate', { toUserId: otherUserId, candidate: e.candidate });
      }
    };
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    let localStream;

    const setup = async () => {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true,
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      if (!incomingCall) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('callUser', { chatId: chat._id, toUserId: otherUserId, offer, callType });
      }
    };
    setup().catch((err) => {
      console.error('Media access failed:', err);
      onClose();
    });

    const onCallAccepted = async ({ answer }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      setStatus('connected');
    };
    const onIceCandidate = async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add ICE candidate', err);
      }
    };
    const onCallRejected = () => {
      setStatus('rejected');
      setTimeout(onClose, 1500);
    };
    const onCallEnded = () => onClose();

    socket.on('callAccepted', onCallAccepted);
    socket.on('iceCandidate', onIceCandidate);
    socket.on('callRejected', onCallRejected);
    socket.on('callEnded', onCallEnded);

    return () => {
      socket.off('callAccepted', onCallAccepted);
      socket.off('iceCandidate', onIceCandidate);
      socket.off('callRejected', onCallRejected);
      socket.off('callEnded', onCallEnded);
      localStream?.getTracks().forEach((t) => t.stop());
      pc.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acceptCall = async () => {
    const pc = pcRef.current;
    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answerCall', { toUserId: otherUserId, answer });
    setStatus('connected');
  };

  const rejectCall = () => {
    socket.emit('rejectCall', { toUserId: otherUserId });
    onClose();
  };

  const endCall = () => {
    socket.emit('endCall', { toUserId: otherUserId });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/90 text-white">
      <div className="relative flex h-full w-full items-center justify-center">
        {callType === 'video' && (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-contain"
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-6 right-6 h-32 w-44 rounded-lg border-2 border-white/20 object-cover"
            />
          </>
        )}
        {callType === 'voice' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-24 w-24 rounded-full bg-white/10 flex items-center justify-center text-4xl">
              🎙️
            </div>
            <audio ref={remoteVideoRef} autoPlay />
          </div>
        )}

        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center">
          <p className="text-lg font-display font-semibold">
            {status === 'incoming' && 'Incoming call...'}
            {status === 'calling' && 'Calling...'}
            {status === 'connected' && 'Connected'}
            {status === 'rejected' && 'Call declined'}
          </p>
        </div>

        <div className="absolute bottom-10 flex gap-4">
          {status === 'incoming' ? (
            <>
              <button
                onClick={acceptCall}
                className="rounded-full bg-green-500 px-6 py-3 font-medium hover:bg-green-600"
              >
                Accept
              </button>
              <button
                onClick={rejectCall}
                className="rounded-full bg-red-500 px-6 py-3 font-medium hover:bg-red-600"
              >
                Decline
              </button>
            </>
          ) : (
            <button
              onClick={endCall}
              className="rounded-full bg-red-500 px-8 py-3 font-medium hover:bg-red-600"
            >
              End Call
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
