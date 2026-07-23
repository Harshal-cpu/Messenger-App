import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VoiceRecorder({ chatId, onSent, onClose }) {
  const [status, setStatus] = useState('recording'); // recording | preview | sending
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    startRecording();
    return () => {
      clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setStatus('preview');
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setDuration(0);
      intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      toast.error('Microphone access denied or unavailable.');
      onClose?.();
    }
  };

  const stopRecording = () => {
    clearInterval(intervalRef.current);
    mediaRecorderRef.current?.stop();
  };

  const discard = () => {
    clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    onClose?.();
  };

  const send = async () => {
    if (!audioBlob) return;
    setStatus('sending');
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, `voice-note-${Date.now()}.webm`);
      await api.post(`/media/chat/${chatId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSent?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send voice note');
      setStatus('preview');
    }
  };

  return (
    <div className="mx-4 mb-2 flex items-center gap-3 rounded-xl border border-app-borderLight dark:border-app-border bg-app-surfaceLight dark:bg-app-surface px-4 py-3">
      {status === 'recording' && (
        <>
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          <span className="flex-1 text-sm font-medium">Recording… {formatDuration(duration)}</span>
          <button
            onClick={discard}
            className="rounded-full px-3 py-1.5 text-xs text-ink-muted hover:bg-black/5 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={stopRecording}
            className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-app-bg hover:bg-accent-dark"
          >
            Stop
          </button>
        </>
      )}

      {status === 'preview' && (
        <>
          <audio ref={audioRef} src={audioUrl} controls className="h-8 flex-1" />
          <button
            onClick={discard}
            className="rounded-full px-3 py-1.5 text-xs text-ink-muted hover:bg-black/5 dark:hover:bg-white/5"
          >
            Discard
          </button>
          <button
            onClick={send}
            className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-app-bg hover:bg-accent-dark"
          >
            Send
          </button>
        </>
      )}

      {status === 'sending' && (
        <span className="text-sm text-ink-muted">Sending voice note…</span>
      )}
    </div>
  );
}
