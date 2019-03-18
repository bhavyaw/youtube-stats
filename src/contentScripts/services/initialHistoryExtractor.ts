import YoutubeVideo from 'background/YoutubeVideo';
import { sendMessageToBackgroundScript } from 'common/utils';
import { APP_CONSTANTS } from 'appConstants';
import { loadExternalDataFetchingScript, sendMessageToVariableAccessScript } from './variableScriptCommunicator';
import { IYoutubeVideo, INewInitialHistoryData, ExtensionModule } from 'models';
import ContinuationDataService from "./continuationDataFetcher";
import isEmpty = require('lodash/isEmpty');

// import isEmpty = require('lodash/isEmpty');
// import findIndex = require('lodash/findIndex');

let lastSavedVideo: IYoutubeVideo = null;

export async function startDataExtractionProcess(lastSavedVideoDetails: IYoutubeVideo) {
  console.log("Extracting initial history data", lastSavedVideoDetails);
  const scriptsWithNonceAttribute = document.querySelectorAll("script[nonce]");
  const initialDataScript: any = Array.from(scriptsWithNonceAttribute).filter((script: any) => script.innerText.startsWith("(function(){window.HISTORY_frontend_user_state"));

  if (initialDataScript) {
    lastSavedVideo = (lastSavedVideoDetails && Object.keys(lastSavedVideoDetails).length) ? lastSavedVideoDetails : null;
    insertInitialDataLoadingScript(initialDataScript[0])
    console.log(`History extraction started...Inserting the variable access script to extract the initial history data`);
    await loadExternalDataFetchingScript('/js/variableAccessScriptNew.js', variableAccessSriptMessageHandler);
    sendMessageToVariableAccessScript({
      type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_INITIAL_YOUTUBE_HISTORY_DATA
    }, ExtensionModule.ContentScript);
  } else {
    sendMessageToBackgroundScript({
      type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.ERROR,
      error_msg: "Unable to find script element that contains initial data"
    }, ExtensionModule.ContentScript);
  }
}

function insertInitialDataLoadingScript(initialDataScript: HTMLScriptElement) {
  const newScriptElem = document.createElement("script");
  let requiredScriptInnerText: string = initialDataScript.innerText;
  const requireEndIndex: number = requiredScriptInnerText.indexOf("window.HISTORY_used_products");
  requiredScriptInnerText = requiredScriptInnerText.slice(0, requireEndIndex);
  requiredScriptInnerText = requiredScriptInnerText + "})();";
  newScriptElem.setAttribute("nonce", "true");
  newScriptElem.innerText = requiredScriptInnerText;
  document.body.appendChild(newScriptElem);
}

function variableAccessSriptMessageHandler(message) {
  const type = message.type;
  // console.log("Message received from variable access script : ", message);

  if (type === APP_CONSTANTS.DATA_EXCHANGE_TYPE.INITIAL_YOUTUBE_HISTORY_DATA) {
    saveInitialHistoryData(message);
  } else if (type === APP_CONSTANTS.DATA_EXCHANGE_TYPE.ERROR) {
    sendMessageToBackgroundScript(message, ExtensionModule.ContentScript);
  }
}

async function saveInitialHistoryData(message) {
  let { data, userId } = message;
  let { newlyWatchedVideos = [], continuationDataFetchingParam }: INewInitialHistoryData = data;
  console.log("inside saving initial history data : ", message, lastSavedVideo);

  newlyWatchedVideos = newlyWatchedVideos.map((newVideo, index) => new YoutubeVideo(newVideo, index));

  if (lastSavedVideo && Object.keys(lastSavedVideo).length) {
    console.log("SavingInitialHistoryData : Last saved video exists. Finding intersection point of last saved video");
    ({ newlyWatchedVideos, continuationDataFetchingParam } = await getVideosToSave(newlyWatchedVideos, continuationDataFetchingParam, false));
  }

  if (!isEmpty(newlyWatchedVideos)) {
    console.log("Sending initial history data to background script : ", newlyWatchedVideos);
    sendMessageToBackgroundScript({
      type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.INITIAL_YOUTUBE_HISTORY_DATA,
      data: {
        newlyWatchedVideos,
        continuationDataFetchingParam
      },
      userId
    }, ExtensionModule.ContentScript);
  }
  lastSavedVideo = null;
}


async function getVideosToSave(newlyWatchedVideos: IYoutubeVideo[], continuationDataFetchingParam, userId, recursiveCall = false) {
  const intersectingVideoIndex: number = newlyWatchedVideos.findIndex(video => video.videoId === lastSavedVideo.videoId);

  if (intersectingVideoIndex === 0) {
    console.log("SavingInitialHistoryData : Intersection point coincides with the first video. Do nothing");
    return {
      newlyWatchedVideos: null,
      continuationDataFetchingParam: null
    };
  } else if (intersectingVideoIndex === -1) {
    console.log("SavingInitialHistoryData : Intersection point doesn't exist. Fetching remaining Initial History Data");
    //remaining initial history data case
    let message: any = await ContinuationDataService.fetchNextContinuationData(continuationDataFetchingParam, userId, false);
    const remainingInitialHistoryData: any = message.data;
    let { newlyWatchedVideos: newlyFetchedVideos } = remainingInitialHistoryData;
    ({ continuationDataFetchingParam } = remainingInitialHistoryData);

    if (newlyFetchedVideos) {
      newlyWatchedVideos = newlyWatchedVideos.concat(newlyFetchedVideos);
      ({ newlyWatchedVideos, continuationDataFetchingParam } = await getVideosToSave(newlyWatchedVideos, continuationDataFetchingParam, userId, true));
    }
  } else if (intersectingVideoIndex > 0) {
    console.log("SavingInitialHistoryData : Intersection point found. Saving new data till intersection point");
    // Intersection case
    newlyWatchedVideos = newlyWatchedVideos.slice(0, intersectingVideoIndex);
  }
  return {
    newlyWatchedVideos,
    continuationDataFetchingParam
  };
}

