import YoutubeVideo from 'background/YoutubeVideo';
import appGlobals from 'globals';
import { INewInitialHistoryData, IExtensionEventMessage, ActivePage } from 'models';
import  axios, {AxiosRequestConfig} from 'axios';
import { DATA_FETCHING_URLS } from 'appConstants';
import {APP_CONSTANTS} from "appConstants";
import { getActivePage } from 'common/utils';
import isEmpty = require('lodash/isEmpty');
import isUndefined = require('lodash/isUndefined');
import isNil = require('lodash/isNil');

class ContinuationDataService {
  constructor() {}

  /**
   * 
   * @param continuationDataFetchingParam 
   * @param requestHeaders 
   * @param messageType {string} - Whether its remaining initial data or continuation data
   */
  async fetchNextContinuationData(continuationDataFetchingParam : string, userId : string, sendContinuationDataToBackgroundScript = true) : Promise<any> {
    let message : any = {};
    const {appVersion} = appGlobals;
    const params : any = {
      jsv  : appVersion
    };

    const data : any = {
      ct : continuationDataFetchingParam
    }

    const config : AxiosRequestConfig = {
      method : "POST",
      params,
      data
    };

    const url = DATA_FETCHING_URLS.CONTINUATION;
    const response : any = await axios(url, config);
    let responseString : string = response.data;
    responseString = responseString.slice(6);
    console.log("Fetching continuation data request response :", response, responseString.slice(0, 500), "\n\n", responseString.slice(-500));
    const responseData : any = JSON.parse(responseString);
    console.log("Response data is : ", responseData);

    if (responseData && !isEmpty(responseData)) {
      let newlyWatchedVideos : any = responseData[0];
      const newContinuationParams : string = responseData[1];

      if (isNil(newlyWatchedVideos)) {
        alert("Newly watched videos missing from the response :    " + newlyWatchedVideos + "  " + newContinuationParams);
        message = {
          type : APP_CONSTANTS.DATA_EXCHANGE_TYPE.CONTINUATION_DATA,
          data : {
            continuationDataFetchingParam : newContinuationParams
          },
          userId
        };
      } else {
        newlyWatchedVideos = newlyWatchedVideos.map(video => new YoutubeVideo(video));
        message = {
          type : APP_CONSTANTS.DATA_EXCHANGE_TYPE.CONTINUATION_DATA,
          data : {
            newlyWatchedVideos,
            continuationDataFetchingParam : newContinuationParams
          },
          userId
        };
      }  
      
  
      if (sendContinuationDataToBackgroundScript) {
        console.log("Sending continuation data to background script : ", message);
        this.sendContinuationDataToBackgroundScript(message);
      }

      return message;
    }
  }

  sendContinuationDataToBackgroundScript(message : IExtensionEventMessage) {
    const activeUrl : string = window.location.href;
    const activePage : ActivePage = getActivePage(activeUrl);

    message = {
      ...message,
      activePage
    };
    
    chrome.runtime.sendMessage(message);
  }
}

const continuationDataService = new ContinuationDataService();
export default continuationDataService;


// data required to fetch continuation data
// post data - session_token - yt.config_.XSRF_TOKEN
// query string params : 
// ctoken: 4qmFsgIZEglGRWhpc3RvcnkaDENMenFfODNWMXQwQw%3D%3D - continuation param - should be present in the storage in background.js
// continuation: 4qmFsgIZEglGRWhpc3RvcnkaDENMenFfODNWMXQwQw%3D%3D - 
// itct: CBwQybcCIhMIjO6rzdPb3QIVxBbVCh0ZJA2I