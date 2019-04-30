import { IYoutubeVideo } from '../interfaces';
import YoutubeVideo from './YoutubeVideo';
import { INewInitialHistoryData, IYoutubeHistory } from 'interfaces';

import isEmpty = require('lodash/isEmpty');
import mergeWith = require('lodash/mergeWith');
import isArray = require('lodash/isArray');
import User from './UserModel';
import BaseModel from './BaseModel';

export default class YoutubeHistory extends BaseModel implements IYoutubeHistory {
  public historyDataArr: YoutubeVideo[];
  public continuationDataFetchingParam: string;
  public userId: string;
  public lastRun: Date;
  public user: User;

  constructor(latestHistoryData: INewInitialHistoryData, userId: string, lastRun?: Date) {
    super(userId);
    const { continuationDataFetchingParam, newlyWatchedVideos } =
      latestHistoryData || ({} as INewInitialHistoryData);

    if (isEmpty(userId)) {
      throw new Error(
        'YoutubeHistory constructor : Missing essential data to intialize the object i.e UserId'
      );
    }
    this.historyDataArr = newlyWatchedVideos || [];
    this.continuationDataFetchingParam = continuationDataFetchingParam;
    this.userId = userId;
    this.lastRun = lastRun;
    this.user = new User(userId);
  }

  public async updateContinuationDataFetchingParam() {
    const newContinuationDataFetchingParam: string = this.continuationDataFetchingParam;
    const savedContinuationDataFetchingParam: string = await this.user.get('continuation');
    if (
      !savedContinuationDataFetchingParam ||
      (savedContinuationDataFetchingParam &&
        savedContinuationDataFetchingParam !== newContinuationDataFetchingParam)
    ) {
      console.log(
        'Info : saving new continuation data fetching param :',
        newContinuationDataFetchingParam
      );
      try {
        return this.user.save('continuation', newContinuationDataFetchingParam);
      } catch (e) {
        console.log('Some error occured in saving user details : ', e);
        throw new Error('Some error occured in saving user details');
      }
    }
  }

  public async updateVideoHistory(): Promise<any> {
    const newlyFetchedVideos: YoutubeVideo[] = this.historyDataArr;
    const userId: string = this.userId;

    // if there are some recently watched videos to be saved
    if (newlyFetchedVideos.length) {
      const pastVideos: YoutubeVideo[] = await this.get();

      try {
        // if there's is data already saved in db then we have to perform some checks to ensure uniqueness of data
        return await this.saveNewVideos(newlyFetchedVideos, pastVideos, userId, false);
      } catch (error) {
        console.log('Some error occured in saving video history', error);
        throw new Error('Some error occured in saving video history');
      }
    }
  }

  public async updateContinuationData(): Promise<any> {
    const userId: string = this.userId;
    const newlyFetchedVideos: YoutubeVideo[] = this.historyDataArr;

    try {
      const savedVideoHistory: YoutubeVideo[] = await this.get();
      console.log(`Saved video history is : `, savedVideoHistory);
      if (savedVideoHistory && !isEmpty(savedVideoHistory)) {
        await this.saveNewVideos(newlyFetchedVideos, savedVideoHistory, userId, true);
      } else {
        return Promise.reject(
          `No saved videos found, therefore cannot save any further continuation data!!!`
        );
      }
    } catch (error) {
      throw {
        message: 'Some error occurred with updating continuation data',
        error
      };
    }
  }

  public async saveNewVideos(
    newVideosToSave: IYoutubeVideo[],
    savedVideoData: any,
    userId: string,
    isContinuationData: Boolean
  ): Promise<any> {
    savedVideoData = savedVideoData || {};
    const currentLastSaveVideo: IYoutubeVideo = newVideosToSave[0];
    const lastRun = this.lastRun;
    const newVidsCumulativeStats: any = {
      totalCount: 0,
      totalWatchedDuration: 0,
      totalActiveDays: 0
    };

    // New Vids
    const newVideosToSaveFormatted: any = newVideosToSave.reduce((acc, curr) => {
      const watchedOnDate: string = curr.formattedWatchedOnDate;
      newVidsCumulativeStats.totalCount++;
      newVidsCumulativeStats.totalWatchedDuration += curr.totalDuration;

      const existingVideosSavedForCurrentDate: IYoutubeVideo = acc[watchedOnDate];
      const currentVideo: IYoutubeVideo[] = [curr];

      if (isArray(existingVideosSavedForCurrentDate)) {
        acc[watchedOnDate] = existingVideosSavedForCurrentDate.concat(currentVideo);
      } else {
        acc[watchedOnDate] = [curr];
        newVidsCumulativeStats.totalActiveDays++;
      }
      return acc;
    }, {});

    mergeWith(savedVideoData, newVideosToSaveFormatted, (objValue, srcValue) => {
      return isArray(objValue) ? srcValue.concat(objValue) : srcValue;
    });

    await this.save(savedVideoData);

    const userDataToUpdate: any = {};
    const lastRunString: string = lastRun.toISOString();
    let existingUserData: User = await this.user.get();
    const previousLastSavedVideo: IYoutubeVideo = existingUserData.lastSavedVideo || {};

    if (!isContinuationData && currentLastSaveVideo.videoId !== previousLastSavedVideo.videoId) {
      userDataToUpdate.lastSavedVideo = currentLastSaveVideo;
    }

    if (existingUserData.lastRun !== lastRunString) {
      userDataToUpdate.lastRun = lastRunString;
    }

    if (!isEmpty(userDataToUpdate)) {
      existingUserData = {
        ...existingUserData,
        ...userDataToUpdate
      };
      await this.user.save(existingUserData);
    }

    await this.user.updateCumulativeStats(newVidsCumulativeStats);
    console.log(
      'YoutubeHistory model - Data saved in Db : ',
      currentLastSaveVideo,
      newVideosToSave
    );
  }
}
