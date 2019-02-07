import {ActivePage, IExtensionEventMessage } from '../models';

import trim =  require('lodash/trim');


export function sendMessageToBackgroundScript(message : IExtensionEventMessage) {
  const activeUrl : string = window.location.href;
  const activePage : ActivePage = getActivePage(activeUrl);

  message = {
    ...message,
    activePage
  };

  chrome.runtime.sendMessage(message);
}

export function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function converUserIdToProperForm(userId : string) : string {
  userId = userId.replace(".com","");
  userId = userId.replace(/\./g, "_"); // replacing underscores with 
  return userId;
}

export function createContinuationDataFetchingUrl(nextContinuationDataFetchingParam: string) {
  const continuation = nextContinuationDataFetchingParam.replace(/%3D/g, "%253D");
  const continuationDataFetchingUrl = `https://www.youtube.com/browse_ajax?ctoken=${continuation}&continuation=${continuation}&itct=${nextContinuationDataFetchingParam}`;
  return continuationDataFetchingUrl;
}


export function timeDifferenceGreaterThan(currentTime : number, pastTime : number, duration : number, hrsMinsSecs : string) : boolean {
  if (!pastTime) {
    return true;
  }
  
  currentTime = currentTime || Date.now();

  const timeDifference = currentTime - pastTime;
  let isTimeDifferenceGreater : boolean = false;

  switch (hrsMinsSecs) {
    case "mm" :
      const minsInMs = duration * 60 * 60;
      isTimeDifferenceGreater = timeDifference > minsInMs;
    break;
  }

  return isTimeDifferenceGreater;
}

export function getActivePage(url : string) : ActivePage{
  const urlObj : URL = new URL(url);
  const pathName : string = urlObj.pathname;

  if (pathName === "/") {
    return ActivePage.home;
  } else if (pathName === "/feed/history") {
    return ActivePage.history;
  } else if (pathName === "/watch") {
    return ActivePage.video;
  } else {
    return ActivePage.other;
  }
}

export function logError(message : string, errorDetails : any, throwError ?: boolean) {
  console.log("Reporting Error to admin", message, errorDetails);

  if (throwError) {
    throw errorDetails;
  }
}

export function extractUserDetailsFromText(userDetailsString : string) {
  const rawUserDetailsSplitArr : string[] = userDetailsString.split("(");
  const name : string = trim(rawUserDetailsSplitArr[0]) ;
  let id = rawUserDetailsSplitArr[1].replace(")", "");
  id = converUserIdToProperForm(id);
  
  // const userDetails : IYoutubeUser = {
  //     id, name
  // };

  // return userDetails;
}

// const clickTrackingParams = objectGet(ytInitialData, "topbar.desktopTopbarRenderer.topbarButtons[4].topbarMenuButtonRenderer.menuRequest.clickTrackingParams");
// const trackingParams = objectGet(ytInitialData, "topbar.desktopTopbarRenderer.trackingParams");
// const csn = objectGet(ytInitialGuideData, "responseContext.webResponseContextExtensionData.ytConfigData.csn");
// const session_token = objectGet(yt, "config_.XSRF_TOKEN");
// const pageBuildLabel = objectGet(yt, "config_.PAGE_BUILD_LABEL");
// const youtubeClientVersion = objectGet(yt, "config_.INNERTUBE_CONTEXT_CLIENT_VERSION");
// const checksum = objectGet(yt, "config_.VARIANTS_CHECKSUM");
// const identityToken = objectGet(yt, "config_.ID_TOKEN");
// const pageCl = objectGet(yt, "config_.PAGE_CL");
