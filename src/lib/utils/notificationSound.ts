/**
 * Play notification sound
 * Falls back silently if sound file doesn't exist or play fails
 */
export function playNotificationSound(): void {
  if (typeof window === "undefined") return;

  try {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 0.5;
    audio.play().catch((err) => {
      // Silently fail - sound file might not exist
      console.debug("Notification sound play failed:", err);
    });
  } catch (error) {
    console.debug("Notification sound error:", error);
  }
}

/**
 * Check if notification sounds are enabled (from user preferences)
 */
export function isNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  
  const preference = localStorage.getItem("notificationSoundEnabled");
  return preference !== "false"; // Default to enabled
}

/**
 * Set notification sound preference
 */
export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("notificationSoundEnabled", enabled.toString());
}
