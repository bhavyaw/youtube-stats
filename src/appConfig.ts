import appStrings from "appStrings";

export enum RefreshIntervals {
  Daily = 1,
  Weekly = 7,
  BiWeekly = 14,
  Monthly = 30,
}

export enum StatsIntervalOptions {
  Daily = 1,
  Weekly = 7,
  Monthly = 30,
  Yearly = 365
};

export enum StatsDisplayTypes {
  Table = 0,
  Graph = 1
};

export const statDisplayFields = {
  [StatsIntervalOptions.Daily] : ["formattedDate", "totalCount", "totalWatchedDuration"],
  [StatsIntervalOptions.Weekly] : ["formattedDate", "totalCount", "totalWatchedDuration", "dailyAverage", "totalActiveDays"],
  [StatsIntervalOptions.Monthly] : ["formattedDate", "totalCount", "totalWatchedDuration", "dailyAverage", "totalActiveDays"],
  [StatsIntervalOptions.Yearly] : ["formattedDate", "totalCount", "totalWatchedDuration", "dailyAverage", "totalActiveDays"]
}

export const appConfig = {
  defaultRefreshInterval: RefreshIntervals.Daily,
  defaultStatsInterval: StatsIntervalOptions.Daily,
  defaultStatDisplayType: StatsDisplayTypes.Table,
  defaultStatsLoadCount: 10 // no. of days, weeks or Months data to load 
};

Object.freeze(statDisplayFields);
Object.freeze(appConfig);
