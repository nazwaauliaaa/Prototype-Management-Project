/**
 * deviceHelper.js
 * Manajemen identitas perangkat unik (Device Binding & Single Device Lock)
 */

export function getDeviceId() {
  try {
    let deviceId = localStorage.getItem('creative_office_device_id');
    if (!deviceId) {
      deviceId = `dev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem('creative_office_device_id', deviceId);
    }
    return deviceId;
  } catch (e) {
    return 'dev-fallback-session';
  }
}

export function getDeviceName() {
  try {
    const savedName = localStorage.getItem('creative_office_device_name');
    if (savedName) return savedName;

    // Deteksi OS & Browser secara ramah pengguna
    const ua = navigator.userAgent;
    let os = 'Perangkat';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'MacOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    let browser = 'Browser';
    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browser = 'Google Chrome';
    else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Apple Safari';

    const generated = `${browser} (${os})`;
    localStorage.setItem('creative_office_device_name', generated);
    return generated;
  } catch {
    return 'Perangkat Ini';
  }
}

/**
 * Utilitas untuk simulasi pengujian perangkat lain
 */
export function simulateSwitchDevice() {
  const newId = `dev-sim-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  localStorage.setItem('creative_office_device_id', newId);
  localStorage.setItem('creative_office_device_name', 'Perangkat Lain (Simulasi Uji)');
  return newId;
}
