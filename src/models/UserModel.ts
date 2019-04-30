import { numberOrString, IYoutubeDayStats } from '../interfaces';
import { appConfig } from 'config';
import { IYoutubeVideo } from 'interfaces';
import BaseModel from './BaseModel';
import { StatsIntervalOptions } from 'interfaces';
import keys = require('lodash/keys');
import isEmpty = require('lodash/isEmpty');
import mergeWith = require('lodash/mergeWith');
import uniq = require('lodash/uniq');

interface IUserCumulativeStats {
  totalCount: number;
  totalWatchedDuration: number;
  totalActiveDays: number;
}

interface UserStats {
  cumulative: IUserCumulativeStats;
  interval: {
    [date: string]: IYoutubeDayStats;
  };
}

export default class User extends BaseModel {
  public readonly lastSavedVideo: IYoutubeVideo | any = {};
  public readonly continuationDataFetchingParam: string = null;
  public readonly lastRun: string = null;
  public readonly lastAccessedStatsInterval: StatsIntervalOptions = appConfig.defaultStatsInterval;
  public readonly stats: UserStats = null;
  public readonly continuation: string = '';

  constructor(userId?: numberOrString, setDefaults = false, storeType?) {
    super(userId, storeType);
    if (setDefaults) {
      this.saveDefaults();
    }
  }

  public async updateCumulativeStats(newVidsCumulativeStats: any): Promise<any> {
    const existingCumulativeStats: any = (await this.get(`stats.cumulative`)) || {};

    if (!isEmpty(existingCumulativeStats)) {
      mergeWith(
        newVidsCumulativeStats,
        existingCumulativeStats,
        (newVidsValue, existingStatsValue) => {
          newVidsValue += existingStatsValue;
          return newVidsValue;
        }
      );
    }

    return await this.save(`stats.cumulative`, newVidsCumulativeStats);
  }

  public async updateActiveUsers(newUsers: string[]): Promise<any>;
  public async updateActiveUsers(newUsers: string[]) {
    const existingUsers = await this.getIds();
    const newUsersToStore: string[] = uniq(existingUsers.concat(newUsers));
    console.log(
      'Existing users : %o, New Extracted Users : %o, New users to save : %o',
      existingUsers,
      newUsers,
      newUsersToStore
    );

    if (existingUsers.length !== newUsersToStore.length) {
      console.log('Saving new users in store : ', newUsersToStore);
      const newUsersToStoreMap: any = newUsersToStore.reduce((acc, curr) => {
        acc[curr] = {};
        return acc;
      }, {});
      // first user
      if (newUsersToStore.length === 1) {
        await this.save(`lastActiveUser`, newUsersToStore[0]);
      }
      await this.save(newUsersToStoreMap);
    }
  }

  public getIds() {
    const users: any = this.get();
    const userIds: any = keys(users);
    return userIds;
  }
}
