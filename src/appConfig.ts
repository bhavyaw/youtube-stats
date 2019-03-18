import { StatsIntervalOptions, RefreshIntervals, StatsDisplayTypes } from "models";

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
