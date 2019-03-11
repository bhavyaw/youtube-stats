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

export enum StatsDataFetchingCases {
  date = 0,
  interval = 1,
  user = 2,
  loadMore = 3
}

export const statDisplayFields = {
  [StatsIntervalOptions.Daily] : ["formattedDate", "totalCount", "formattedDuration"],
  [StatsIntervalOptions.Weekly] : ["formattedDate", "totalCount", "formattedDuration", "formmattedDailyAverage", "totalActiveDays"],
  [StatsIntervalOptions.Monthly] : ["formattedDate", "totalCount", "formattedDuration", "formmattedDailyAverage", "totalActiveDays"],
  [StatsIntervalOptions.Yearly] : ["formattedDate", "totalCount", "formattedDuration", "formmattedDailyAverage", "totalActiveDays"]
}

export const appConfig = {
  defaultRefreshInterval: RefreshIntervals.Daily,
  defaultStatsInterval: StatsIntervalOptions.Daily,
  defaultStatDisplayType: StatsDisplayTypes.Table,
  defaultStatsLoadCount: 10 // no. of days, weeks or Months data to load 
};

Object.freeze(statDisplayFields);
Object.freeze(appConfig);
