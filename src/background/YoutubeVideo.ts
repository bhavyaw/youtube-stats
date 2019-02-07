import { IYoutubeVideo, IYoutubeUser } from './../models';
import { storeAsync as store } from 'chrome-utils';

import get =  require("lodash/get");
import isUndefined = require("lodash/isUndefined");
import validate = require('object-validate');
import isEmpty = require("lodash/isEmpty");
import values =  require('lodash/values');
import isString = require('lodash/isString');
import { formatDate } from './services/utils';

const videoDataValidationSchema = validate({
    title : (val) => val !== "",
    id : (val) => val !== "",
    localWatchedOnDate : (val) => val !== ""
});;

export default class YoutubeVideo implements IYoutubeVideo {
    videoId : string = "";
    title : string = "";
    totalDurationText : string = ""; 
    percentWatched : number = null;
    totalDuration : number = 0; // seconds
    watchedDuration : number = 0; // seconds
    channel : object = {};
    device : string = "";
    watchedOnDate : string = ""; // UTC in ISO string
    formattedWatchedOnDate : string = "";

    constructor (videoData, index?) {
        if (isEmpty(videoData)) {
            throw new Error(`Youtube video data not , ${index}`)
        }
        // to save details from youtube video page
        this.extractYoutubeVideoData(videoData);
    }
    
    extractYoutubeVideoData(videoData : any[]) {
        this.title = get(videoData, [9,0]);
        const videoLink : string = get(videoData, [9,3]);
        this.videoId = videoLink && videoLink.split("v=").pop();
        const channelDetails : any[] = get(videoData, [13, 0]);

        if (!isEmpty(channelDetails)) {
            this.channel["name"] = channelDetails[0];
            const channelLink : string = channelDetails[1];
            this.channel["id"] = channelLink && channelLink.length && channelLink.split("/").pop();
        }
        this.device = get(videoData, [19, 0]);
        const codedLocalWatchedOnDate : string = videoData[4];
        const decodedLocalWatchedOnDate : number = parseInt(codedLocalWatchedOnDate.slice(0,-3));
        const localWatchedOnDate : Date = new Date(decodedLocalWatchedOnDate);
        this.watchedOnDate = localWatchedOnDate.toISOString(); // to save
        this.formattedWatchedOnDate = formatDate(localWatchedOnDate, "dd-mm-yyyy");
        this.totalDurationText = get(videoData, [23,1]);

        if (this.totalDurationText) {
            this.totalDuration = this.calculateTotalDurationInSeconds(this.totalDurationText);
            this.percentWatched = get(videoData, [23,2]);
            this.watchedDuration = this.percentWatched ? Math.ceil((this.percentWatched * this.totalDuration) / 100) : this.totalDuration; 
        }

        // validation
        const dataValidation = videoDataValidationSchema(this);
        const isDataValidated = values(dataValidation).every(val => Boolean(val));
        
        if (!isDataValidated) {
            throw new Error("Critical data missing from the video Data, unable to save video details ${dataValidation}");
        }
    }
    
    instantiateFromYoutubeVideoPageData(youtubeVideo : IYoutubeVideo) {
        Object.assign(this, youtubeVideo);
        const totalDurationText = youtubeVideo.totalDurationText;

        if (totalDurationText) {
            this.totalDuration = this.calculateTotalDurationInSeconds(this.totalDurationText);
        }
    }

    instantiateFromInitialHistoryData(youtubeVideo : any) {
        const ytv = youtubeVideo["videoRenderer"];
        const publisherDetails : any = get(ytv, 'ownerText.runs[0]');
        const publisherName : string = get(publisherDetails, 'text');
        const publisherId : string = get(publisherDetails, 'navigationEndpoint.browserEndpoint.browserId');
        
        this.videoId = ytv.videoId;
        this.title = get(ytv, 'title.simpleText');
        this.totalDurationText = get(ytv, 'lengthText.simpleText') || null;

        // not live video
        if (this.totalDurationText) {
            this.totalDuration = this.calculateTotalDurationInSeconds(this.totalDurationText);
            const percentageWatched = get(ytv, 'thumbnailOverlays[0].thumbnailOverlayResumePlaybackRenderer.percentDurationWatched');
            this.percentWatched = !isUndefined(percentageWatched) ? percentageWatched : 100 ;
            this.watchedDuration = Math.ceil((percentageWatched * this.totalDuration) / 100);
        }
      
        // this.description = get(ytv, "descriptionSnippet.simpleText") || "";

        this.channel = {
            name : publisherName,
            id : publisherId
        };

        this.watchedOnDate = null;
    }

    async saveVideoDetailsInTempStorage(userDetails : IYoutubeUser, youtubeVideo : IYoutubeVideo) {
        const videoId = this.videoId;        

        if (userDetails && userDetails.id) {
            let storedTempVids : any = await store.get(`temp.currentVideos.${userDetails.id}`);
            storedTempVids = storedTempVids || {};

            Object.assign(storedTempVids, {
                [videoId] : youtubeVideo
            });

            return store.set(`temp.currentVideos.${userDetails.id}`, storedTempVids);
        }
    }

    async updateVideoDetailsInTempStorage(userDetails : IYoutubeUser, updatedVideoDetails : IYoutubeVideo) {
        const videoId = this.videoId;        

        if (userDetails && userDetails.id) {
            return store.set(`temp.currentVideos.${userDetails.id}.${videoId}`, updatedVideoDetails)
        }
    }
    

    calculateTotalDurationInSeconds(totalDurationText : string) : number {
        const totalDurationTextSplit : string[] = totalDurationText.split(':');
        let totalDurationHrs = 0, totalDurationMins = 0, totalDurationSecs = 0;
  
        if (totalDurationTextSplit.length === 2) {
              totalDurationMins = parseInt(totalDurationTextSplit[0]) * 60;
              totalDurationSecs = parseInt(totalDurationTextSplit[1]);
          } else if (totalDurationTextSplit.length === 3 ) {
              totalDurationHrs = parseInt(totalDurationTextSplit[0]) * 60 * 60;
              totalDurationMins = parseInt(totalDurationTextSplit[1]) * 60;
              totalDurationSecs = parseInt(totalDurationTextSplit[2]);
          }
          
        const totalDuration = totalDurationHrs + totalDurationMins + totalDurationSecs;
        return totalDuration;
      }
}