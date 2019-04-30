import User from 'Models/UserModel';

export type stringOrArr = string | string[];
export type chromeStorage = chrome.storage.LocalStorageArea | chrome.storage.SyncStorageArea;
export type storeType = 'local' | 'sync';
export type numberOrString = number | string;

export enum ActivePage {
  home = 'home',
  history = 'history',
  video = 'video',
  activityControls = 'activityControls',
  myActivity = 'myActivity',
  other = 'other'
}

export enum RefreshIntervals {
  Daily = 1,
  Weekly = 7,
  BiWeekly = 14,
  Monthly = 30
}

export enum StatsIntervalOptions {
  Daily = 1,
  Weekly = 7,
  Monthly = 30,
  Yearly = 365
}

export enum StatsDisplayTypes {
  Table = 0,
  Graph = 1
}

export enum StatsDataFetchingCases {
  date = 0,
  interval = 1,
  user = 2,
  loadMore = 3
}

export enum ExtensionModule {
  Popup,
  ContentScript,
  Background,
  VariableAccessScript
}

export enum IRoutingType {
  FROM_OUTSIDE_YOUTUBE,
  FROM_WITHIN_YOUTUBE,
  NOT_YOUTUBE_PAGE
}

export interface IRoute {
  currentActivePage: ActivePage;
  previousActivePage: ActivePage;
  routeType: IRoutingType;
}

export interface IYoutubeUser {
  id: string;
  name?: string;
}

export interface IContinuationParams {
  continuation: string;
  clickTrackingParams: string;
}

export interface IExtensionEventMessage {
  type: string;
  data?: any;
  activePage?: ActivePage;
  userId?: string;
  route?: IRoute;
  receiver?: string;
  sender: ExtensionModule;
  error_msg?: string;
}

export interface INewInitialHistoryData {
  continuationDataFetchingParam: string;
  newlyWatchedVideos: any[];
  userId?: string;
  requestHeaders?: IRequestHeaders;
}

export interface IRequestHeaders {
  clickTrackingParams: string;
  trackingParams: string;
  csn?: string;
  sessionToken: string;
  pageBuildLabel: string;
  youtubeClientVersion: string;
  checksum: string;
  identityToken: string;
  pageCl: number;
}

export interface IYoutubeVideo {
  videoId: string;
  title: string;
  totalDurationText: string;
  totalDuration?: number; // seconds
  percentWatched?: number;
  watchedDuration?: number; // seconds
  description?: string;
  channel: any;
  watchedOnDate: string | null;
  formattedWatchedOnDate?: string | null;
  device: string;
}

export interface IYoutubeHistory {
  historyDataArr: IYoutubeVideo[];
  continuationDataFetchingParam: string;
  userId: string;
  lastRun: Date;
  user?: User;
}

export interface IYoutubeDayStats {
  totalWatchedDuration: number; // seconds
  totalCount: number;
  lastWatchedVideo: IYoutubeVideo;
  totalActiveDays: number;
  displayDate: string;
  watchedOnDate?: string | string[];
  videos?: IYoutubeVideo[] | null;
}

export interface IYoutubeWeekStats extends IYoutubeDayStats {
  dailyAverageDuration: number;
}

export interface IYoutubeDatesStats {
  totalActiveDays: number;
  totalWatchedDuration: number; // seconds
  totalCount: number;
  dailyAverage: number;
  dayStats: IYoutubeDayStats[] | null;
  weekDates?: string[];
}

export interface IHistoryStats {
  totalActiveDays: number;
  totalCount: number;
  totalWatchedDuration: number;
  updateHistoryStats?(any);
}
