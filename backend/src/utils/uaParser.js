/**
 * uaParser — lightweight user-agent parser (no external dependencies).
 *
 * Returns: { browser, os, deviceName }
 * Used to enrich session records with human-readable device info.
 */

const BROWSERS = [
  { pattern: /Edg\/[\d.]+/,           name: 'Edge' },
  { pattern: /OPR\/[\d.]+/,           name: 'Opera' },
  { pattern: /SamsungBrowser\/[\d.]+/, name: 'Samsung Browser' },
  { pattern: /UCBrowser\/[\d.]+/,      name: 'UC Browser' },
  { pattern: /Chrome\/[\d.]+/,         name: 'Chrome' },
  { pattern: /Firefox\/[\d.]+/,        name: 'Firefox' },
  { pattern: /Safari\/[\d.]+/,         name: 'Safari' },
  { pattern: /MSIE [\d.]+/,            name: 'Internet Explorer' },
  { pattern: /Trident\/[\d.]+/,        name: 'Internet Explorer' },
  { pattern: /curl\/[\d.]+/,           name: 'curl' },
];

const OS_LIST = [
  { pattern: /Windows NT 10\.0/,  name: 'Windows 10' },
  { pattern: /Windows NT 6\.3/,   name: 'Windows 8.1' },
  { pattern: /Windows NT 6\.2/,   name: 'Windows 8' },
  { pattern: /Windows NT 6\.1/,   name: 'Windows 7' },
  { pattern: /Windows/,           name: 'Windows' },
  { pattern: /iPhone OS ([\d_]+)/, name: (m) => `iOS ${m[1].replace(/_/g, '.')}` },
  { pattern: /iPad.*OS ([\d_]+)/,  name: (m) => `iPadOS ${m[1].replace(/_/g, '.')}` },
  { pattern: /Android ([\d.]+)/,   name: (m) => `Android ${m[1]}` },
  { pattern: /Mac OS X ([\d_]+)/,  name: (m) => `macOS ${m[1].replace(/_/g, '.')}` },
  { pattern: /Macintosh/,          name: 'macOS' },
  { pattern: /Linux/,              name: 'Linux' },
  { pattern: /CrOS/,               name: 'Chrome OS' },
];

const DEVICE_TYPES = [
  { pattern: /iPhone/,  name: 'iPhone' },
  { pattern: /iPad/,    name: 'iPad' },
  { pattern: /Android/, name: 'Android Device' },
  { pattern: /Mobile/,  name: 'Mobile Device' },
];

/**
 * Parse a User-Agent string into structured session metadata.
 *
 * @param {string|null} ua  Raw User-Agent header value
 * @returns {{ browser: string, os: string, deviceName: string }}
 */
export function parseUserAgent(ua) {
  if (!ua) {
    return { browser: 'Unknown', os: 'Unknown', deviceName: 'Unknown Device' };
  }

  // Browser
  let browser = 'Unknown Browser';
  for (const { pattern, name } of BROWSERS) {
    if (pattern.test(ua)) {
      browser = name;
      break;
    }
  }

  // OS
  let os = 'Unknown OS';
  for (const { pattern, name } of OS_LIST) {
    const m = ua.match(pattern);
    if (m) {
      os = typeof name === 'function' ? name(m) : name;
      break;
    }
  }

  // Device name — compose from device type + browser
  let deviceType = 'Desktop';
  for (const { pattern, name } of DEVICE_TYPES) {
    if (pattern.test(ua)) {
      deviceType = name;
      break;
    }
  }

  const deviceName = `${deviceType} — ${browser} on ${os}`;

  return { browser, os, deviceName };
}
