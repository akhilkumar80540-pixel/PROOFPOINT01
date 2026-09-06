// Window duration in seconds
export const TOKEN_WINDOW_SECONDS = 30;

// Derive current window index
export function getCurrentWindow() {
  return Math.floor(Date.now() / (TOKEN_WINDOW_SECONDS * 1000));
}

// Generate token using SHA-256 (eventId + windowSalt)
export async function generateRollingToken(eventId, windowIndex) {
  const message = `${eventId}:${windowIndex}:PROOFPOINT_SALT_2026`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 10);
}

// Validate token (allows current window and previous window to handle edge-second scans)
export async function validateRollingToken(eventId, token, providedWindow) {
  if (!token || !providedWindow) return false;
  
  const currentWindow = getCurrentWindow();
  const windowInt = parseInt(providedWindow, 10);

  // Accept current window or previous window (max 30s latency tolerance)
  if (Math.abs(currentWindow - windowInt) > 1) {
    return false;
  }

  const expectedToken = await generateRollingToken(eventId, windowInt);
  return expectedToken === token;
}