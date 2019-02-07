export enum ActivePage {
    home = "home",
    history = "history",
    video = "video",
    other = "other"
}

export enum IRoutingType { FROM_OUTSIDE_YOUTUBE, FROM_WITHIN_YOUTUBE, NOT_YOUTUBE_PAGE}

export interface IRoute {
    currentActivePage : ActivePage,
    previousActivePage : ActivePage,
    routeType : IRoutingType
}

export interface IYoutubeUser {
    id : string,
    name ?: string
}

export interface IContinuationParams {
    continuation : string,
    clickTrackingParams : string
}

export interface IExtensionEventMessage {
    type : string,
    data ?: any,
    activePage ?: ActivePage,
    userId ? : string,
    route ?: IRoute,
    receiver ?: string,
    sender ?: string,
    error_msg ?: string
}

export interface INewInitialHistoryData {
    continuationDataFetchingParam : string,
    newlyWatchedVideos : any[],
    userId ?: string,
    requestHeaders ?: IRequestHeaders
}

export interface IRequestHeaders {
    clickTrackingParams : string
    trackingParams : string
    csn ?: string
    sessionToken : string
    pageBuildLabel : string
    youtubeClientVersion : string
    checksum : string
    identityToken : string
    pageCl : number
}

export interface IYoutubeVideo {
    videoId : string,
    title : string,
    totalDurationText : string, 
    totalDuration ?: number, // seconds
    percentWatched ?:number,
    watchedDuration ?: number, // seconds
    description ?: string,
    channel : object,
    watchedOnDate : string | null,
    formattedWatchedOnDate ?: string | null,
    device : string
}

export interface IYoutubeHistory {
    historyDataArr : IYoutubeVideo[];
    continuationDataFetchingParam : string;
    userId : string;
    lastRun : Date;
}

export interface IYoutubeDayStats {
    totalWatchedDuration : number, // seconds
    totalCount : number,
    watchedOnDate ?: string, 
    videos ?: IYoutubeVideo[] | null
}

export interface IYoutubeDatesStats{
    totalActiveDays : number
    totalWatchedDuration : number, // seconds
    totalCount : number,
    dailyAverage : number,
    dayStats : IYoutubeDayStats[] | null,
    weekDates ? : string[]
}

export interface IHistoryStats{
    totalActiveDays : number,
    totalCount : number,
    totalWatchedDuration : number,
    weekStats : IYoutubeDatesStats | null,
    updateHistoryStats ?(any),
}
