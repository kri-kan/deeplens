import { CampaignName } from './types';

export interface CampaignScheduleRule {
  campaign: CampaignName;
  startMonthDay: string; // MM-DD format e.g. "02-07"
  endMonthDay: string;   // MM-DD format e.g. "02-15"
  priority: number;
}

export const CAMPAIGN_SCHEDULE: CampaignScheduleRule[] = [
  { campaign: 'valentine',   startMonthDay: '02-07', endMonthDay: '02-15', priority: 10 },
  { campaign: 'ramadan',     startMonthDay: '03-01', endMonthDay: '04-05', priority: 10 },
  { campaign: 'summer',      startMonthDay: '06-01', endMonthDay: '08-31', priority: 5 },
  { campaign: 'blackfriday', startMonthDay: '11-20', endMonthDay: '11-30', priority: 20 },
];

/**
 * Helper to check if a target "MM-DD" falls within [start, end].
 */
function isDateWithinRange(targetMD: string, startMD: string, endMD: string): boolean {
  if (startMD <= endMD) {
    return targetMD >= startMD && targetMD <= endMD;
  }
  // Span across year boundary (e.g. 12-20 to 01-05)
  return targetMD >= startMD || targetMD <= endMD;
}

/**
 * Returns the currently active campaign based on a given date (defaults to today).
 * Falls back to 'luxe' if no scheduled campaign window is active.
 */
export function getActiveScheduledCampaign(date: Date = new Date()): CampaignName {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const todayMD = `${month}-${day}`;

  const matchingRules = CAMPAIGN_SCHEDULE.filter((rule) =>
    isDateWithinRange(todayMD, rule.startMonthDay, rule.endMonthDay)
  );

  if (matchingRules.length === 0) {
    return 'luxe';
  }

  // Pick highest priority
  matchingRules.sort((a, b) => b.priority - a.priority);
  return matchingRules[0].campaign;
}
