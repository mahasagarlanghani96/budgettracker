interface ParsedUA {
  browser: string;
  os: string;
  deviceType: string;
}

export function parseUserAgent(ua: string): ParsedUA {
  const browser = detectBrowser(ua);
  const os = detectOS(ua);
  const deviceType = detectDevice(ua);
  return { browser, os, deviceType };
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return 'Edge ' + (ua.match(/Edg\/([\d.]+)/)?.[1] || '').split('.')[0];
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Browser';
  if (/UCBrowser/i.test(ua)) return 'UC Browser';
  if (/CriOS/i.test(ua)) return 'Chrome (iOS)';
  if (/FxiOS/i.test(ua)) return 'Firefox (iOS)';
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return 'Chrome ' + (ua.match(/Chrome\/([\d.]+)/)?.[1] || '').split('.')[0];
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return 'Safari ' + (ua.match(/Version\/([\d.]+)/)?.[1] || '').split('.')[0];
  if (/Firefox\//i.test(ua)) return 'Firefox ' + (ua.match(/Firefox\/([\d.]+)/)?.[1] || '').split('.')[0];
  return 'Unknown Browser';
}

function detectOS(ua: string): string {
  if (/Windows NT 10/i.test(ua)) return 'Windows 10/11';
  if (/Windows NT/i.test(ua)) return 'Windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android ' + (ua.match(/Android ([\d.]+)/)?.[1] || '').split('.')[0];
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS ' + (ua.match(/OS ([\d_]+)/)?.[1] || '').replace(/_/g, '.');
  if (/Linux/i.test(ua)) return 'Linux';
  if (/CrOS/i.test(ua)) return 'ChromeOS';
  return 'Unknown OS';
}

function detectDevice(ua: string): string {
  if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua)) return 'mobile';
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}
