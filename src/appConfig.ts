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

export const appConfig = {
  defaultRefreshInterval: RefreshIntervals.Daily,
  defaultStatsInterval: StatsIntervalOptions.Daily,
  defaultStatDisplayType: StatsDisplayTypes.Table,
  defaultStatsLoadCount: 10 // no. of days, weeks or Months data to load 
};

Object.freeze(appConfig);