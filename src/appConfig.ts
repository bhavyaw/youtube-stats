
export enum refreshIntervals {
  Daily = 1,
  Weekly = 7,
  BiWeekly = 14,
  Monthly = 30,
}

export const statsIntervalOptions = {
  "DAILY": "Daily",
  "WEEKLY": "Weekly",
  "MONTHLY": "Monthly",
  "YEARLY": "Yearly"
};

export const statsDisplayType = {
  "TABLE": "Table",
  "GRAPH": "Graph"
};

export const appConfig = {
  defaultRefreshInterval: refreshIntervals.Daily,
  defaultStatsInterval: statsIntervalOptions.MONTHLY,
  defaultStatDisplayType: statsDisplayType.TABLE
};

Object.freeze(appConfig);