import { useCallback, useEffect, useState } from "react";

export function useWebNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return "denied";
    
    const res = await Notification.requestPermission();
    setPermission(res);
    return res;
  }, []);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: "/favicon.ico", // Lunara icon
        badge: "/favicon.ico",
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.error("Failed to send notification:", e);
    }
  }, []);

  return {
    permission,
    requestPermission,
    sendNotification,
    isSupported: typeof window !== "undefined" && "Notification" in window,
  };
}
