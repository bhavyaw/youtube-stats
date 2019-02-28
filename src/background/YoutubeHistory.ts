import { APP_CONSTANTS } from 'appConstants';
import { IYoutubeVideo, IHistoryStats } from './../models';
import { storeAsync as store } from 'chrome-utils';
import YoutubeVideo from "./YoutubeVideo";
import { INewInitialHistoryData, IYoutubeHistory } from 'models';

import isEmpty = require("lodash/isEmpty");
import mergeWith = require("lodash/mergeWith");
import isArray = require("lodash/isArray");
import YoutubeHistoryStats from './services/YoutubeHistoryStats';

export default class YoutubeHistory implements IYoutubeHistory {
    historyDataArr: YoutubeVideo[];
    continuationDataFetchingParam: string;
    userId: string;
    lastRun: Date;

    constructor(latestHistoryData: INewInitialHistoryData, userId: string, lastRun: Date) {
        console.log("Inside VideoHistory Model : ", latestHistoryData, userId);
        const { continuationDataFetchingParam, newlyWatchedVideos } = latestHistoryData;

        if (isEmpty(userId)) {
            throw new Error("YoutubeHistory constructor : Missing essential data to intialize the object i.e UserId");
        }
        this.historyDataArr = newlyWatchedVideos || [];
        this.continuationDataFetchingParam = continuationDataFetchingParam;
        this.userId = userId;
        this.lastRun = lastRun;
    }

    async updateContinuationDataFetchingParam() {
        const userId: string = this.userId;
        const newContinuationDataFetchingParam: string = this.continuationDataFetchingParam;
        const savedContinuationDataFetchingParam: string = await store.get(`continuation.${userId}`);

        if (!savedContinuationDataFetchingParam || (savedContinuationDataFetchingParam && savedContinuationDataFetchingParam !== newContinuationDataFetchingParam)) {
            console.log("Info : saving new continuation data fetching param :", newContinuationDataFetchingParam);
            try {
                return store.set(`continuation.${userId}`, newContinuationDataFetchingParam);
            } catch (e) {
                console.log("Some error occured in saving user details : ", e);
                throw new Error("Some error occured in saving user details");
            }
        }
    }

    async updateVideoHistory(): Promise<any> {
        let newlyFetchedVideos: YoutubeVideo[] = this.historyDataArr;
        const userId: string = this.userId;

        // if there are some recently watched videos to be saved
        if (newlyFetchedVideos.length) {
            const pastVideos: YoutubeVideo[] = await store.get(`videoHistory.${userId}`);

            try {
                // if there's is data already saved in db then we have to perform some checks to ensure uniqueness of data
                return this.saveNewVideos(newlyFetchedVideos, pastVideos, userId, false);
            } catch (error) {
                console.log("Some error occured in saving video history", error);
                throw new Error("Some error occured in saving video history");
            }
        }
    }

    async updateContinuationData(): Promise<any> {
        const userId: string = this.userId;
        let newlyFetchedVideos: YoutubeVideo[] = this.historyDataArr;

        try {
            const savedVideoHistory: YoutubeVideo[] = await store.get(`videoHistory.${userId}`);
            console.log(`Saved video history is : `, savedVideoHistory);
            if (savedVideoHistory && !isEmpty(savedVideoHistory)) {
                await this.saveNewVideos(newlyFetchedVideos, savedVideoHistory, userId, true);
            } else {
                return Promise.reject(`No saved videos found, therefore cannot save any further continuation data!!!`);
            }
        } catch (error) {
            throw {
                message: "Some error occurred with updating continuation data",
                error
            }
        }
    }


    async saveNewVideos(newVideosToSave: IYoutubeVideo[], savedVideoData: any, userId: string, isContinuationData: Boolean): Promise<any> {
        savedVideoData = savedVideoData || {};
        let lastSavedVideo: IYoutubeVideo = newVideosToSave[0];
        let existingUsers: any = await store.get(`users`) || [];
        const lastRun = this.lastRun;


        // New Vids
        const newVideosToSaveFormatted: any = newVideosToSave.reduce((acc, curr) => {
            const watchedOnDate: string = curr["formattedWatchedOnDate"];
            const existingVideosSavedForCurrentDate: IYoutubeVideo = acc[watchedOnDate];
            const currentVideo: IYoutubeVideo[] = [curr];
            acc[watchedOnDate] = isArray(existingVideosSavedForCurrentDate) ? existingVideosSavedForCurrentDate.concat(currentVideo) : [curr];
            return acc;
        }, {});

        mergeWith(savedVideoData, newVideosToSaveFormatted, (objValue, srcValue) => {
            return isArray(objValue) ? srcValue.concat(objValue) : srcValue;
        });
        await store.set(`videoHistory.${userId}`, savedVideoData);

        // lastSavedVideo
        if (!isContinuationData) {
            await store.set(`lastSavedVideo.${userId}`, lastSavedVideo);
        }

        // History stats
        // const lastStats: IHistoryStats = await store.get(`historyStats.${userId}`);
        // const historyStats: IHistoryStats = new YoutubeHistoryStats({
        //     newVideosToSave,
        //     newVideosToSaveFormatted,
        //     userId,
        //     savedVideoData,
        //     isContinuationData,
        //     lastRun,
        //     lastStats
        // });
        // let latestHistoryStats: IHistoryStats = await historyStats.updateHistoryStats(userId);

        // update last run time
        const lastRunString: string = lastRun.toISOString();
        await store.set(`lastRun.${userId}`, lastRunString);

        // update users list
        if (!existingUsers.includes(userId)) {
            await store.set(`users`, [...existingUsers, userId]);
        }

        // update last active user
        await store.set(`lastActiveUser`, userId);
        chrome.runtime.sendMessage({
            type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.HISTORY_DATA_UPDATED,
            sender: APP_CONSTANTS.SENDER.BACKGROUND,
            userId
        });
        console.log("YoutubeHistory model - Data saved in Db : ", lastSavedVideo, newVideosToSave);
    }

}