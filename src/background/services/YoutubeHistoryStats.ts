import { APP_CONSTANTS } from './../../appConstants';
import { isEmpty, keys, union, intersection } from 'lodash';
import { IHistoryStats, IYoutubeDatesStats, IYoutubeVideo, IYoutubeHistory, IYoutubeDayStats } from 'models';
import { storeAsync as store } from 'chrome-utils';
import { formatDate, convertDurationToProperFormat } from './utils';
import isString = require('lodash/isString');
import { StatsIntervalOptions, statDisplayFields } from 'config';
import isUndefined = require('lodash/isUndefined');
import isNil = require('lodash/isNil');


export default class YoutubeHistoryStats implements IHistoryStats {
  totalCount: number = 0;
  totalWatchedDuration: number = 0;
  lastRun: string;
  weekStats: any = null;
  dailyAverage: number = 0;
  totalActiveDays: number = 0;

  constructor(data: any) {
    const {
      newVideosToSave,
      newVideosToSaveFormatted,
      savedVideoData,
      isContinuationData,
      lastRun,
      lastStats,
    } = data;

    let newTotalCount: number = newVideosToSave.length, newTotalWatchedDuration: number = 0;
    const newActiveDays: string[] = keys(newVideosToSaveFormatted);
    const lastActiveDays: string[] = keys(savedVideoData);
    const totalActiveDaysArr: string[] = union(newActiveDays, lastActiveDays);
    const totalActiveDays: number = totalActiveDaysArr.length

    let lastWeekStats: IYoutubeDatesStats = lastStats && lastStats.weekStats;
    let weekStats: IYoutubeDatesStats = null;

    newVideosToSave.forEach(video => {
      newTotalWatchedDuration += video.watchedDuration;
    });

    if (!isEmpty(lastStats)) {
      newTotalCount += lastStats.totalCount || 0;
      newTotalWatchedDuration += lastStats.totalWatchedDuration || 0;
    }

    if (isContinuationData && !isEmpty(lastWeekStats)) {
      const lastWeekDates: string[] = lastWeekStats.weekDates || [];
      const intersectingDates: string[] = intersection(lastWeekDates, newActiveDays);
      if (intersectingDates.length) {
        weekStats = this.getWeekStats(lastRun, newVideosToSaveFormatted, lastWeekStats);
      } else {
        weekStats = lastWeekStats
      }
    } else {
      weekStats = this.getWeekStats(lastRun, newVideosToSaveFormatted, lastWeekStats);
    }

    const newHistoryStats: IHistoryStats = {
      totalActiveDays,
      totalCount: newTotalCount,
      totalWatchedDuration: newTotalWatchedDuration,
      weekStats
    };

    Object.assign(this, newHistoryStats);
  }

  public async updateHistoryStats(userId): Promise<IHistoryStats> {
    await store.set(`historyStats.${userId}`, this);
    return this;
  }

  private getWeekStats(lastRunDate: Date, newVideosToSaveFormatted, lastWeekStats: IYoutubeDatesStats) {
    let totalCount = 0, totalWatchedDuration = 0, dailyAverage = 0, totalActiveDays = 0, weekDates = [];
    let dayStats: any = [];


    " ".repeat(7).split("").map((e, i) => {
      let currentDateTotalCount = 0, currentDateTotalDuration = 0, anyVidsForCurrentDay: boolean = false;
      const date = new Date(lastRunDate);
      date.setDate(date.getDate() - i);
      const formattedCurrentDate: string = formatDate(date, "dd-mm-yyyy");
      let videosForCurrentDate: IYoutubeVideo[] = newVideosToSaveFormatted[formattedCurrentDate] || [];

      weekDates.push(formattedCurrentDate);

      videosForCurrentDate.forEach(video => {
        ++currentDateTotalCount;
        currentDateTotalDuration += video.watchedDuration;
      });

      if (videosForCurrentDate.length) {
        anyVidsForCurrentDay = true;
      }

      if (lastWeekStats) {
        let lastWeekDaysStats: IYoutubeDayStats[] = lastWeekStats.dayStats;
        let lastWeekStatsForCurrentDate: IYoutubeDayStats[] = lastWeekDaysStats.filter(lastWeekDayStats => lastWeekDayStats.watchedOnDate === formattedCurrentDate);

        // assimilating totals from last week as well
        if (lastWeekStatsForCurrentDate.length) {
          anyVidsForCurrentDay = true;
          const currentDateVidsFromLastWeek: IYoutubeDayStats = lastWeekStatsForCurrentDate[0];
          currentDateTotalCount += currentDateVidsFromLastWeek.totalCount;
          currentDateTotalDuration += currentDateVidsFromLastWeek.totalWatchedDuration;
          videosForCurrentDate = videosForCurrentDate.concat(currentDateVidsFromLastWeek.videos);
        }
      }

      if (anyVidsForCurrentDay) {
        ++totalActiveDays;
      }

      dayStats.push({
        totalCount: currentDateTotalCount,
        totalWatchedDuration: currentDateTotalDuration,
        watchedOnDate: formattedCurrentDate,
        videos: videosForCurrentDate
      });

      totalCount += currentDateTotalCount;
      totalWatchedDuration += currentDateTotalDuration;
    });

    dailyAverage = Math.round((totalWatchedDuration / 7) * 100) / 100;

    const weekStats: IYoutubeDatesStats = {
      totalCount,
      totalWatchedDuration,
      dailyAverage,
      totalActiveDays,
      dayStats,
      weekDates
    }

    console.log("week dates are : ", weekStats);
    return weekStats;
  }

  public static async getStatForDates(statsInterval: StatsIntervalOptions, fromDate: Date, endDate: Date, userId, formattedDate) {
    fromDate = isString(fromDate) ? new Date(fromDate) : fromDate;
    let tempFromDate = new Date(fromDate);

    const videoHistory: IYoutubeHistory = await store.get(`videoHistory.${userId}`);
    let lastWatchedVideo: any;
    let totalCount = 0, totalWatchedDuration = 0, dailyAverage = 0, daysDiff = 0, totalActiveDays = 0, fromDateGreaterThanEndDate = false;

    while (!fromDateGreaterThanEndDate) {
      let dayStats: any = YoutubeHistoryStats.getStatForDay(videoHistory, tempFromDate, totalActiveDays);
      let { dayTotalCount, dayTotalDuration, lastWatchedVideoOfDay } = dayStats;
      ({ totalActiveDays } = dayStats);

      totalCount += dayTotalCount;
      totalWatchedDuration += dayTotalDuration;
      daysDiff++;

      // const dayStats: IYoutubeDayStats = {
      //   totalCount: dayTotalCount,
      //   totalWatchedDuration: dayTotalDuration,
      //   watchedOnDate: formattedCurrentDate,
      //   videos: videosForCurrentDate
      // };
      // datesStats.dayStats.push(dayStats);
      
      // In Daily stats interval we don't iterate and need to keep tempFromDate equal to the from date
      tempFromDate = new Date(tempFromDate.getTime() + APP_CONSTANTS.DAY_IN_MS);
      fromDateGreaterThanEndDate = tempFromDate.getTime() > endDate.getTime();

      // last cycle
      if (fromDateGreaterThanEndDate) {
        lastWatchedVideo = lastWatchedVideoOfDay;
      }
    } 

    if (totalCount > 0) {
      dailyAverage = Math.round((totalWatchedDuration / daysDiff) * 100) / 100;
      const formmattedDailyAverage : string = convertDurationToProperFormat(dailyAverage);
      const formattedDuration : string = convertDurationToProperFormat(totalWatchedDuration);
      let stats: any = {
        lastWatchedVideo,
        totalCount,
        formattedDuration,
        formmattedDailyAverage,
        formattedDate
      };
  
      if ( statsInterval === StatsIntervalOptions.Daily ) {
        stats.watchedOnDate = fromDate.toISOString();
      } else {
        stats.watchedOnDate = [fromDate.toISOString(), endDate.toISOString()];
        stats.dailyAverage = dailyAverage;
        stats.totalActiveDays = totalActiveDays;
      }

      return stats;
    }
  }

  private static getStatForDay(videoHistory: IYoutubeHistory, date: Date, totalActiveDays: number) {
    const formattedCurrentDate = formatDate(date, "dd-mm-yyyy");
    const videosForCurrentDate = videoHistory[formattedCurrentDate] || [];
    let dayTotalCount = 0, dayTotalDuration = 0;
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
    }
  }
  /**
   * 
   * @param statsInterval - Daily, Weekly, Monthly, Yearly
   * @param date - date representing dates, week, month or year
   * @param loadCount {number} : Number of days, weeks, months data to load
   */
  public static async getStatsForInterval(statsInterval: StatsIntervalOptions, date: Date, userId: string, loadCount: number) {
    console.log(`getStatsForInterval() : generating stats for interval`, statsInterval, date);
    const statsPromises: Array<Promise<IYoutubeDayStats>> = [];
    date = new Date(date);

    switch (statsInterval) {
      case StatsIntervalOptions.Daily: {
        const startingDate: Date = date;
        for (let i=0; i<loadCount; i++) {
          const fromDate = new Date(startingDate.getTime() - APP_CONSTANTS.DAY_IN_MS * i);
          const formattedDate = fromDate.toLocaleDateString("en-us", {
            weekday : "short",
            day : "numeric",
            month : "numeric",
            year : "2-digit"
          });
          statsPromises.push(YoutubeHistoryStats.getStatForDates(statsInterval, fromDate, fromDate, userId, formattedDate));
        }
        break;
      }


      case StatsIntervalOptions.Weekly: {
        const dayIndex: number = date.getDay();
        const startingDate: Date = new Date(date.getTime() - APP_CONSTANTS.DAY_IN_MS * (dayIndex ? (dayIndex - 1) : 6)   ); // starting from monday
        console.log(`Inside get stats for Interval : ${statsInterval}. Start of the week is :`, startingDate);

        for (let i=0; i<loadCount; i++) {
          const fromDate = new Date(startingDate.getFullYear(), startingDate.getMonth(), (startingDate.getDate() - (StatsIntervalOptions.Weekly * i)));
          const endDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), (fromDate.getDate() + (StatsIntervalOptions.Weekly - 1)));
          const dateOpts : any = {
            weekday : "short",
            day : "numeric",
            month : "numeric",
            year : "2-digit"
          };
          const formattedDate : string = `${fromDate.toLocaleDateString("en-us", dateOpts)} - ${endDate.toLocaleDateString("en-us", dateOpts)}`;
          const dayStats: Promise<IYoutubeDayStats> = YoutubeHistoryStats.getStatForDates(statsInterval, fromDate, endDate, userId, formattedDate);
          statsPromises.push(dayStats);
        }
        break;
      }

      case StatsIntervalOptions.Monthly: {
        const startingDate: Date = new Date(date.getFullYear(), date.getMonth());
        for (let i=0; i<loadCount; i++) {
          const fromDate = new Date(startingDate.getFullYear(), (startingDate.getMonth() - i), 1);
          const endDate = new Date(fromDate.getFullYear(), (fromDate.getMonth() + 1), 0);
          const dateOpts : any = {
            month : "short",
            year : "2-digit"
          };
          const formattedDate : string = `${fromDate.toLocaleDateString("en-us", dateOpts)}`;
          const dayStats: Promise<IYoutubeDayStats> = YoutubeHistoryStats.getStatForDates(statsInterval, fromDate, endDate, userId, formattedDate);
          statsPromises.push(dayStats);
        }
        break;
      }

      case StatsIntervalOptions.Yearly: {
        const dateYear: number = date.getFullYear();
        const startingDate = new Date(dateYear, 0, 1);

        for (let i=0; i<loadCount; i++) {
          const fromDate = new Date((startingDate.getFullYear() - i), 0, 1);
          const endDate = new Date((fromDate.getFullYear() + 1), 0, 0);
          const dateOpts : any = {
            year : "numeric"
          };
          const formattedDate : string = `${fromDate.toLocaleDateString("en-us", dateOpts)}`;
          const dayStats: Promise<IYoutubeDayStats> = YoutubeHistoryStats.getStatForDates(statsInterval, fromDate, endDate, userId, formattedDate);
          statsPromises.push(dayStats);
        }
        break;
      }
    }

    let finalStats = await Promise.all(statsPromises);
    finalStats = finalStats.filter(finalStats => !isUndefined(finalStats));
    console.log(`Stats for ${statsInterval} and date : ${date.toDateString()} are : `, finalStats);
    return finalStats;
  }
}
