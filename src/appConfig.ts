import { StatsIntervalOptions, RefreshIntervals, StatsDisplayTypes } from 'interfaces';

export const statDisplayFields = {
  [StatsIntervalOptions.Daily]: ['formattedDate', 'totalCount', 'formattedDuration'],
  [StatsIntervalOptions.Weekly]: [
    'formattedDate',
    'totalCount',
    'formattedDuration',
    'totalActiveDays'
  ],
  [StatsIntervalOptions.Monthly]: [
    'formattedDate',
    'totalCount',
    'formattedDuration',
    'totalActiveDays'
  ],
  [StatsIntervalOptions.Yearly]: [
    'formattedDate',
    'totalCount',
    'formattedDuration',
    'totalActiveDays'
  ]
};

export const appConfig = {
  defaultRefreshInterval: RefreshIntervals.Daily,
  defaultStatsInterval: StatsIntervalOptions.Daily,
  defaultStatDisplayType: StatsDisplayTypes['Tabular View'],
  defaultStatsLoadCount: 10 // no. of days, weeks or Months data to load
};

Object.freeze(statDisplayFields);
Object.freeze(appConfig);
