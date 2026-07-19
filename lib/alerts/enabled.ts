export function isAlertsEnabled(): boolean {
  return process.env.MISSION_CONTROL_ALERTS?.trim().toLowerCase() === "enabled";
}
