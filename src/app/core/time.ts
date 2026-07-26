const timeFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

export function formatTime(d: Date): string {
  return timeFormatter.format(d);
}

/** Departure-monitor style: prefer the human platform name, fall back to a bare platform code. */
export function formatPlatform(platformName: string | null, platform: string | null): string {
  if (platformName) return platformName;
  if (platform) return `Platform ${platform}`;
  return "";
}

/** Trip-leg style: a parenthetical suffix for an already-resolved platform string, or empty. */
export function platformSuffix(platform: string | null): string {
  return platform ? ` (Platform ${platform})` : "";
}
