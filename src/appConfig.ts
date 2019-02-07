export enum refreshInterval {
  Daily = 1,
  Weekly = 7,
  BiWeekly = 14,
  Monthly = 30,
}


export const appConfig = {
  defaultRefreshInterval : refreshInterval.Daily,
};