import { APP_CONSTANTS } from '../appConstants';
import {
  IHistoryStats,
  IYoutubeVideo,
  IYoutubeHistory,
  IYoutubeDayStats,
  StatsIntervalOptions
} from 'interfaces';
import { formatDate } from 'common/utils';
import { convertDurationToProperFormat } from 'common/utils';
import isString = require('lodash/isString');
import isUndefined = require('lodash/isUndefined');
import isEmpty = require('lodash/isEmpty');
import { kebabCase, clone } from 'lodash';
import User from './UserModel';
import YoutubeHistory from './YoutubeHistory';

class YoutubeHistoryStatsService implements IHistoryStats {
  public totalCount: number = 0;
  public totalWatchedDuration: number = 0;
  public lastRun: string;
  public weekStats: any = null;
  public dailyAverage: number = 0;
  public totalActiveDays: number = 0;

  constructor() {}

  // TODO : try to use the cache decorator/annotation here
  public async getStatForDates(
    statsInterval: StatsIntervalOptions,
    fromDate: Date,
    endDate: Date,
    userId: string,
    formattedDate
  ) {
    const user: User = new User(userId);
    const youtubeHistory: YoutubeHistory = new YoutubeHistory(null, userId);

    let cachedStatsForDate: IYoutubeDayStats;
    // first try to retrive from cache
    if (
      statsInterval === StatsIntervalOptions.Yearly ||
      statsInterval === StatsIntervalOptions.Monthly
    ) {
      cachedStatsForDate = await this.retrieveStatsFromCache(user, formattedDate);
      console.log(`Retrieved cached stats...`, formattedDate, cachedStatsForDate);
      if (!isEmpty(cachedStatsForDate)) {
        console.log(
          `Stats retrived from cache only. Not going throught the entire process again...`,
          formattedDate,
          cachedStatsForDate
        );
        return cachedStatsForDate;
      }
    }

    fromDate = isString(fromDate) ? new Date(fromDate) : fromDate;
    let tempFromDate = new Date(fromDate);
    const videoHistory: IYoutubeHistory = await youtubeHistory.get();

    if (!isEmpty(videoHistory)) {
      let lastWatchedVideo: any;
      let totalCount = 0,
        totalWatchedDuration = 0,
        dailyAverage = 0,
        daysDiff = 0,
        totalActiveDays = 0,
        fromDateGreaterThanEndDate = false;

      while (!fromDateGreaterThanEndDate) {
        const dayStats: any = this.getStatForDay(videoHistory, tempFromDate, totalActiveDays);
        const { dayTotalCount, dayTotalDuration, lastWatchedVideoOfDay } = dayStats;

        ({ totalActiveDays } = dayStats);
        totalCount += dayTotalCount;
        totalWatchedDuration += dayTotalDuration;
        daysDiff++;
        tempFromDate = new Date(tempFromDate.getTime() + APP_CONSTANTS.DAY_IN_MS);
        fromDateGreaterThanEndDate = tempFromDate.getTime() > endDate.getTime();

        // last cycle
        if (fromDateGreaterThanEndDate) {
          lastWatchedVideo = lastWatchedVideoOfDay;
        }
      }

      dailyAverage = totalWatchedDuration
        ? Math.round((totalWatchedDuration / daysDiff) * 100) / 100
        : 0;
      const formattedDailyAverage: string = convertDurationToProperFormat(dailyAverage);
      const formattedDuration: string = convertDurationToProperFormat(totalWatchedDuration);

      const stats: any = {
        lastWatchedVideo,
        totalCount,
        formattedDuration,
        formattedDailyAverage,
        formattedDate,
        totalWatchedDuration
      };

      if (statsInterval === StatsIntervalOptions.Daily) {
        stats.watchedOnDate = fromDate.toISOString();
      } else {
        stats.watchedOnDate = [fromDate.toISOString(), endDate.toISOString()];
        stats.dailyAverage = dailyAverage;
        stats.totalActiveDays = totalActiveDays;
      }

      if (
        statsInterval === StatsIntervalOptions.Monthly ||
        statsInterval === StatsIntervalOptions.Yearly
      ) {
        const statsDupe = clone(stats);
        formattedDate = kebabCase(formattedDate);
        await user.save(`stats.interval.${formattedDate}`, statsDupe);
        console.log(`Saving Stats in Cache :`, formattedDate, statsDupe);
      }

      return stats;
    }
  }

  private getStatForDay(videoHistory: IYoutubeHistory, date: Date, totalActiveDays: number) {
    const formattedCurrentDate = formatDate(date, 'dd-mm-yyyy');
    const videosForCurrentDate = videoHistory[formattedCurrentDate] || [];
    let dayTotalCount = 0,
      dayTotalDuration = 0;
    const lastWatchedVideoOfDay: IYoutubeVideo = videosForCurrentDate[0];

    if (videosForCurrentDate.length) {
      ++totalActiveDays;
    }

    videosForCurrentDate.forEach((video: IYoutubeVideo) => {
      ++dayTotalCount;
      dayTotalDuration += video.watchedDuration;
    });

    return {
      dayTotalCount,
      dayTotalDuration,
      totalActiveDays,
      lastWatchedVideoOfDay
    };
  }
  /**
   *
   * @param statsInterval - Daily, Weekly, Monthly, Yearly
   * @param date - date representing dates, week, month or year
   * @param loadCount {number} : Number of days, weeks, months data to load
   */
  public async getStatsForInterval(
    statsInterval: StatsIntervalOptions,
    date: Date,
    userId: string,
    loadCount: number
  ) {
    console.log(`getStatsForInterval() : generating stats for interval`, statsInterval, date);

    try {
      let finalStats: IYoutubeDayStats[] = [];
      date = new Date(date);

      switch (statsInterval) {
        case StatsIntervalOptions.Daily: {
          const startingDate: Date = date;
          for (let i = 0; i < loadCount; i++) {
            const fromDate = new Date(startingDate.getTime() - APP_CONSTANTS.DAY_IN_MS * i);
            const formattedDate = fromDate.toLocaleDateString('en-us', {
              weekday: 'short',
              day: 'numeric',
              month: 'numeric',
              year: '2-digit'
            });
            finalStats.push(
              await this.getStatForDates(statsInterval, fromDate, fromDate, userId, formattedDate)
            );
          }
          break;
        }

        case StatsIntervalOptions.Weekly: {
          const dayIndex: number = date.getDay();
          const startingDate: Date = new Date(
            date.getTime() - APP_CONSTANTS.DAY_IN_MS * (dayIndex ? dayIndex - 1 : 6)
          ); // starting from monday
          console.log(
            `Inside get stats for Interval : ${statsInterval}. Start of the week is :`,
            startingDate
          );

          for (let i = 0; i < loadCount; i++) {
            const fromDate = new Date(
              startingDate.getFullYear(),
              startingDate.getMonth(),
              startingDate.getDate() - StatsIntervalOptions.Weekly * i
            );
            const endDate = new Date(
              fromDate.getFullYear(),
              fromDate.getMonth(),
              fromDate.getDate() + (StatsIntervalOptions.Weekly - 1)
            );
            const dateOpts: any = {
              weekday: 'short',
              day: 'numeric',
              month: 'numeric',
              year: '2-digit'
            };
            const formattedDate: string = `${fromDate.toLocaleDateString(
              'en-us',
              dateOpts
            )} - ${endDate.toLocaleDateString('en-us', dateOpts)}`;
            const dayStats: IYoutubeDayStats = await this.getStatForDates(
              statsInterval,
              fromDate,
              endDate,
              userId,
              formattedDate
            );
            finalStats.push(dayStats);
          }
          break;
        }

        case StatsIntervalOptions.Monthly: {
          const startingDate: Date = new Date(date.getFullYear(), date.getMonth());
          for (let i = 0; i < loadCount; i++) {
            const fromDate = new Date(startingDate.getFullYear(), startingDate.getMonth() - i, 1);
            const endDate = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0);
            const dateOpts: any = {
              month: 'short',
              year: '2-digit'
            };
            const formattedDate: string = `${fromDate.toLocaleDateString('en-us', dateOpts)}`;
            const dayStats: IYoutubeDayStats = await this.getStatForDates(
              statsInterval,
              fromDate,
              endDate,
              userId,
              formattedDate
            );
            finalStats.push(dayStats);
          }
          break;
        }

        case StatsIntervalOptions.Yearly: {
          const dateYear: number = date.getFullYear();
          const startingDate = new Date(dateYear, 0, 1);

          for (let i = 0; i < loadCount; i++) {
            const fromDate = new Date(startingDate.getFullYear() - i, 0, 1);
            const endDate = new Date(fromDate.getFullYear() + 1, 0, 0);
            const dateOpts: any = {
              year: 'numeric'
            };
            const formattedDate: string = `${fromDate.toLocaleDateString('en-us', dateOpts)}`;
            const dayStats: IYoutubeDayStats = await this.getStatForDates(
              statsInterval,
              fromDate,
              endDate,
              userId,
              formattedDate
            );
            finalStats.push(dayStats);
          }
          break;
        }
      }

      console.log(
        `Stats for ${statsInterval} and date : ${date.toDateString()} are : `,
        finalStats
      );
      finalStats = finalStats.filter((finalStats) => !isUndefined(finalStats));
      return finalStats;
    } catch (error) {
      console.log(`getStatsForInterval() : Some error occurred : `, error);
    }
  }

  private async retrieveStatsFromCache(user: User, formattedDate: string) {
    formattedDate = kebabCase(formattedDate);
    const cachedIntervalStats: any = await user.get(`stats.interval.${formattedDate}`);
    return cachedIntervalStats;
  }
}

const youtubeHistoryStatsService = new YoutubeHistoryStatsService();
export default youtubeHistoryStatsService;
