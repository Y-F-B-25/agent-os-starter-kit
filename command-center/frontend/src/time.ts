export function displayClockFromMessage(message: { ts?: string; timestamp?: string }): string {
  if (message.ts) {
    const date = new Date(message.ts);
    if (!Number.isNaN(date.getTime())) return date.toTimeString().slice(0, 8);
  }
  return message.timestamp || "";
}
