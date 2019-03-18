import { getActivePage } from 'common/utils';
import { ActivePage, ExtensionModule } from "models";
import { APP_CONSTANTS, DATA_FETCHING_URLS } from "appConstants";
import { loadExternalDataFetchingScript, sendMessageToVariableAccessScript } from './services/variableScriptCommunicator';
import axios, { AxiosRequestConfig } from 'axios';
import isEmpty = require('lodash/isEmpty');
import isNil = require('lodash/isNil');
import get = require('lodash/get');


console.log("=== YOUTUBE HISTORY PAGE CONTENT SCRIPT ====");
const all_videos = [];
let lastFetchedContinuationData : any;
startContentScript();

function startContentScript() {
  window.onload = windowOnloadHandler;
}

function windowOnloadHandler() {
  console.log(`Youtube History item page loaded...`);
  extractInitialHistoryData();
}

async function extractInitialHistoryData() {
  await loadExternalDataFetchingScript('/js/youtubeHistoryPageVariableAccessor.js', (variableAccessSriptMessageHandler));
  const activeUrl : string = window.location.href;
  const activePage : ActivePage = getActivePage(activeUrl);
  
  sendMessageToVariableAccessScript({
    type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_YOUTUBE_HISTORY_PAGE_INITIAL_DATA,
    activePage
  }, ExtensionModule.ContentScript);
}

function variableAccessSriptMessageHandler(message) {
  const {type, sender} = message;
  console.log("Message received from variable access script : ", message);

  if (sender === ExtensionModule.VariableAccessScript) {
    if (type === APP_CONSTANTS.DATA_EXCHANGE_TYPE.YOUTUBE_HISTORY_PAGE_INITIAL_DATA) {
      let { data : initialHistoryData } = message;
      console.log(`Initial History data  : `,initialHistoryData);
      extractContinuationData(initialHistoryData);
    }
  }
}

async function extractContinuationData({
  requestHeaders : rh,
  newlyWatchedVideos = [],
  continuationDataFetchingParams
}) : Promise<any> {
    all_videos.push(...newlyWatchedVideos);
    const {
      clickTrackingParams : ctp,
      continuation : cntn
    } = continuationDataFetchingParams;

    const queryParam = {
      itct : ctp,
      cToken : cntn,
      continuation : cntn
    };

    const headers = {
      "x-youtube-page-cl" : rh.pageCl,
      "x-youtube-variants-checksum" : rh.checksum,
      "x-youtube-page-label" : rh.pageBuildLabel,
      "content-type": "application/x-www-form-urlencoded",
      "x-youtube-client-name" : 1,
      "x-youtube-client-version" : rh.youtubeClientVersion,
      "x-youtube-identity-token" : rh.identityToken,
      "x-youtube-utc-offset" : 330
    };

    var bodyFormData = new FormData();
    bodyFormData.append("session_token", rh.sessionToken);

    const config : AxiosRequestConfig = {
      method : "POST",
      params : queryParam,
      headers,
      data : bodyFormData
    };

    const url = DATA_FETCHING_URLS.YOUTUBE_HISTORY_CONTINUATION;
    const response : any = await axios(url, config);
    const data = get(response, "data[1].response");
    // console.log("Response data is : ", response, data);

    if (!data) {
      throw new Error("Continuation Data is empty!!!");
    }

    const innerData : any = get(data, "continuationContents.itemSectionContinuation");
    const videos : any = get(innerData, "contents");
    const contiuationData : any = get(innerData, "continuations[0].nextContinuationData");
    const clickTrackingParams : string = get(contiuationData, "clickTrackingParams");
    const continuation : string = get(contiuationData, "continuation");

    if (isEmpty(videos) || isEmpty(clickTrackingParams) || isEmpty(continuation)) {
      console.error("Missing some inner data", innerData, videos, clickTrackingParams, continuation, all_videos, lastFetchedContinuationData);
      throw new Error("Missing some inner data");
    }
    
    lastFetchedContinuationData = {clickTrackingParams, continuation};
    console.log(`Total Video Length Now is : ${all_videos.length}`);

    setTimeout(async () => {
      await extractContinuationData({
        requestHeaders : rh,
        newlyWatchedVideos : videos,
        continuationDataFetchingParams : {
          continuation, clickTrackingParams
        }
      });
    }, 1000);
}

console.log("======= Extract Continuation Data ========", extractContinuationData);
