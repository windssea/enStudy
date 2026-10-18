// For these same-origin checks all session cookies use Path=/.
// Login first expires old cookies, then replaces them in later Set-Cookie lines.
export function responseCookieHeader(lines) {
  const cookies = new Map();
  for (const line of lines) {
    const pair = line.split(";", 1)[0];
    const at = pair.indexOf("=");
    if (at <= 0) continue;
    const name = pair.slice(0, at).trim();
    const value = pair.slice(at + 1);
    if (value) cookies.set(name, value);
    else cookies.delete(name);
  }
  return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
}
