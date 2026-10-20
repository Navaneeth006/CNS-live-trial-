// Utility to identify and label the current browser / mobile client session
// Uses localStorage so that reloading the page or scanning via camera keeps the exact same device ID

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'unknown-device';
  try {
    let id = localStorage.getItem('cuecontrol_device_id');
    if (!id) {
      id = sessionStorage.getItem('cuecontrol_device_id');
    }
    if (!id) {
      // Create a unique device session token
      const randomSegment = Math.random().toString(36).substring(2, 8);
      const timestampSegment = Date.now().toString(36);
      id = `dev-${randomSegment}-${timestampSegment}`;
      try {
        localStorage.setItem('cuecontrol_device_id', id);
      } catch {
        // Fallback for private browsing
        sessionStorage.setItem('cuecontrol_device_id', id);
      }
    } else {
      // Ensure it is synced to localStorage if it was only in sessionStorage
      try {
        localStorage.setItem('cuecontrol_device_id', id);
      } catch {
        // Ignore
      }
    }
    return id;
  } catch {
    return 'temp-' + Math.random().toString(36).substring(2, 8);
  }
}

export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Remote Device';
  try {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const shortId = getDeviceId().slice(-4).toUpperCase();
    if (/iPhone/i.test(navigator.userAgent)) return `iPhone (${shortId})`;
    if (/iPad/i.test(navigator.userAgent)) return `iPad (${shortId})`;
    if (/Android/i.test(navigator.userAgent)) return `Android Device (${shortId})`;
    if (isMobile) return `Mobile Device (${shortId})`;
    return `Remote Browser (${shortId})`;
  } catch {
    return 'Mobile Controller';
  }
}
