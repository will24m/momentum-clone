import { format, formatDistanceToNowStrict } from "date-fns";

export function formatHeaderDate(date = new Date()) {
  return format(date, "EEEE, MMMM d");
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function formatSyncTime(timestamp: string | null) {
  if (!timestamp) {
    return "Not synced yet";
  }

  return `${formatDistanceToNowStrict(new Date(timestamp), { addSuffix: true })}`;
}

