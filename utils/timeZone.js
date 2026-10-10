// The phone's IANA time zone (e.g. "America/Chicago"). Sent with working hours so
// the backend computes booking slots in the shop's local time.
export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}
