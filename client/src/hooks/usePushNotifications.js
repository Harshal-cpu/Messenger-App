import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';

// Converts a URL-safe base64 VAPID public key into the Uint8Array format
// the PushManager API expects.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false);
      setLoading(false);
      return;
    }
    setSupported(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setSubscribed(!!existing);
    } catch {
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const subscribe = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission was not granted.');
        return;
      }

      const { data } = await api.get('/push/vapid-public-key');
      if (!data.data.publicKey) {
        toast.error('Push notifications are not configured on the server.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.data.publicKey),
      });

      await api.post('/push/subscribe', subscription.toJSON());
      setSubscribed(true);
      toast.success('Push notifications enabled');
    } catch (err) {
      toast.error('Could not enable push notifications.');
    }
  };

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      toast.success('Push notifications disabled');
    } catch (err) {
      toast.error('Could not disable push notifications.');
    }
  };

  return { supported, subscribed, loading, subscribe, unsubscribe };
}
