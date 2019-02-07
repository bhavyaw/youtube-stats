import { IYoutubeDayStats } from './../../models';
import { isEmpty, keys, union, intersection } from 'lodash';
import { IHistoryStats, IYoutubeDatesStats, IYoutubeVideo, IYoutubeHistory } from '../../models';
import { storeAsync as store } from 'chrome-utils';
import { formatDate } from './utils';
import isString = require('lodash/isString');


export default class YoutubeHistoryStats implements IHistoryStats{
  totalCount : number = 0;
  totalWatchedDuration : number = 0;
  lastRun : string;
  weekStats : any = null;
  dailyAverage : number = 0;
  totalActiveDays : number = 0;

  constructor(data : any) {
    const {
      newVideosToSave,
      newVideosToSaveFormatted, 
      savedVideoData,
      isContinuationData,
      lastRun,
      lastStats,
    } = data;

    let newTotalCount : number = newVideosToSave.length, newTotalWatchedDuration : number = 0;
    const newActiveDays : string[] = keys(newVideosToSaveFormatted);
    const lastActiveDays : string[] = keys(savedVideoData);
    const totalActiveDaysArr : string[] = union(newActiveDays, lastActiveDays);
    const totalActiveDays : number = totalActiveDaysArr.length

    let lastWeekStats : IYoutubeDatesStats = lastStats && lastStats.weekStats;
    let weekStats : IYoutubeDatesStats = null;

    newVideosToSave.forEach(video => {
      newTotalWatchedDuration += video.watchedDuration;
    });

    if (!isEmpty(lastStats)) {
      newTotalCount += lastStats.totalCount || 0;
      newTotalWatchedDuration += lastStats.totalWatchedDuration || 0;
    }

    if (isContinuationData && !isEmpty(lastWeekStats)) {
      const lastWeekDates : string[] = lastWeekStats.weekDates || [];
      const intersectingDates : string[] = intersection(lastWeekDates, newActiveDays);
      if (intersectingDates.length) {
        weekStats = this.getWeekStats(lastRun, newVideosToSaveFormatted, lastWeekStats);
      } else {
        weekStats = lastWeekStats
      }
    } else {
      weekStats = this.getWeekStats(lastRun, newVideosToSaveFormatted, lastWeekStats);
    }

    const newHistoryStats : IHistoryStats = {
      totalActiveDays,
      totalCount : newTotalCount,
      totalWatchedDuration : newTotalWatchedDuration,
      weekStats
    };

    Object.assign(this, newHistoryStats);
  }

  public async updateHistoryStats(userId) : Promise<IHistoryStats>{
    await store.set(`historyStats.${userId}`, this);
    return this;
  }

  private getWeekStats(lastRunDate : Date, newVideosToSaveFormatted, lastWeekStats : IYoutubeDatesStats) {
    let totalCount = 0, totalWatchedDuration = 0, dailyAverage = 0, totalActiveDays = 0, weekDates = [];
    let dayStats : any = [];
    

    " ".repeat(7).split("").map((e, i) => {
      let currentDateTotalCount = 0, currentDateTotalDuration = 0, anyVidsForCurrentDay : boolean = false;
      const date = new Date(lastRunDate);
      date.setDate(date.getDate() - i);
      const formattedCurrentDate : string =  formatDate(date, "dd-mm-yyyy");
      let videosForCurrentDate : IYoutubeVideo[] = newVideosToSaveFormatted[formattedCurrentDate] || [];

      weekDates.push(formattedCurrentDate);

      videosForCurrentDate.forEach(video => {
        ++currentDateTotalCount;
        currentDateTotalDuration += video.watchedDuration;
      });

      if (videosForCurrentDate.length) {
        anyVidsForCurrentDay = true;
      }

      if (lastWeekStats) {
        let lastWeekDaysStats : IYoutubeDayStats[] = lastWeekStats.dayStats;
        let lastWeekStatsForCurrentDate : IYoutubeDayStats[] = lastWeekDaysStats.filter(lastWeekDayStats => lastWeekDayStats.watchedOnDate === formattedCurrentDate); 

        // assimilating totals from last week as well
        if (lastWeekStatsForCurrentDate.length) {
          anyVidsForCurrentDay = true;
          const currentDateVidsFromLastWeek : IYoutubeDayStats = lastWeekStatsForCurrentDate[0];
          currentDateTotalCount += currentDateVidsFromLastWeek.totalCount;
          currentDateTotalDuration += currentDateVidsFromLastWeek.totalWatchedDuration;
          videosForCurrentDate = videosForCurrentDate.concat(currentDateVidsFromLastWeek.videos);
        }
      }
  
      if (anyVidsForCurrentDay) {
        ++totalActiveDays;
      }

      dayStats.push({
        totalCount : currentDateTotalCount,
        totalWatchedDuration : currentDateTotalDuration,
        watchedOnDate : formattedCurrentDate,
        videos : videosForCurrentDate
      });

      totalCount += currentDateTotalCount;
      totalWatchedDuration += currentDateTotalDuration;
    });

    dailyAverage = Math.round((totalWatchedDuration / 7) * 100 ) / 100;

    const weekStats : IYoutubeDatesStats = {
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

  public static async getStatForDates(fromDate : Date, endDate : Date, userId) {
    fromDate = isString(fromDate) ? new Date(fromDate) : fromDate;
    endDate = isString(endDate) ? new Date(endDate) : endDate;

    const videoHistory : IYoutubeHistory = await store.get(`videoHistory.${userId}`);
    const datesStats = {
      dayStats : []
    };
    
    let totalCount = 0, totalWatchedDuration = 0, dailyAverage = 0, daysDiff = 0, totalActiveDays = 0;
    
    while (
      endDate.getFullYear() !== fromDate.getFullYear() &&
      endDate.getMonth() !== fromDate.getMonth() &&
      endDate.getDate() !== fromDate.getDate()
    ) {
      const formattedCurrentDate = formatDate(endDate, "dd-mm-yyyy");
      const videosForCurrentDate = videoHistory[formattedCurrentDate] || [];
      let dayTotalCount = 0, dayTotalDuration = 0;

      if (videosForCurrentDate.length) {
        ++totalActiveDays;
      }

      videosForCurrentDate.forEach((video : IYoutubeVideo) => {
        ++dayTotalCount;
        dayTotalDuration += video.watchedDuration;
      });

      
      const dayStats: IYoutubeDayStats = {
        totalCount : dayTotalCount,
        totalWatchedDuration : dayTotalDuration,
        watchedOnDate : formattedCurrentDate,
        videos : videosForCurrentDate
      };
      datesStats.dayStats.push(dayStats);

      totalCount += dayTotalCount;
      totalWatchedDuration += dayTotalDuration;
      daysDiff++;
    }
    
    dailyAverage = Math.round((totalWatchedDuration / daysDiff) * 100 ) /100;

    Object.assign(datesStats, {
      totalCount,
      totalWatchedDuration,
      totalActiveDays,
      dailyAverage
    });

    return datesStats;
  }
}
