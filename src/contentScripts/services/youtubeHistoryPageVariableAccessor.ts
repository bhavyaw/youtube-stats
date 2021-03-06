import { IRequestHeaders, IExtensionEventMessage, IRoutingType, IRoute, ExtensionModule } from "interfaces";
import { APP_CONSTANTS } from "appConstants";

class WindowCommunicator {
  listeners: Function[] = [];
  targetUrl: string = "";
  listenerAlreadyExist: boolean = false;

  constructor() {
      this.targetUrl = location.protocol + "//" + location.hostname;
  }

  addListener(windowNode, onNewMessage) {
      if (!this.listenerAlreadyExist) {
          this.listenerAlreadyExist = true;
          this.listeners.push(onNewMessage);
          window.addEventListener('message', (e) => this.handleEventListener(windowNode, e));
      }
      else {
          this.listeners.push(onNewMessage);
      }
  }

  handleEventListener(windowNode, e) {
      // We only accept messages from ourselves
      if (windowNode && windowNode != e.source) {
          return;
      }
      this.listeners.forEach(listener => listener(e));
  }

  sendMessage(windowNode, message, targetUrl = this.targetUrl) {
      const messageToSend : IExtensionEventMessage = {
          ...message,
          sender : ExtensionModule.VariableAccessScript
      };
      windowNode.postMessage(messageToSend, targetUrl);
  }
}

const windowCommunicator = new WindowCommunicator();

listenToMessagesFromContentScript();

// listeners 
function listenToMessagesFromContentScript() {
  console.log("VARIABLE_ACCESS_SCRIPT : listening for messages from CONTENT_SCRIPT : ", window);
  windowCommunicator.addListener(window, handleMessageFromContentScript);
}

function handleMessageFromContentScript(event) {
  const message: IExtensionEventMessage = event.data;
  const {type : contentType, activePage, sender} = message;

  if (sender === ExtensionModule.ContentScript) {
    console.log(`Message received from CONTENT SCRIPT :`, contentType, "\n\n");
    switch (contentType) {
        case APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_YOUTUBE_HISTORY_PAGE_INITIAL_DATA:
          getInitialHistoryData(activePage);
          break;
    }
  }
}

// @forTesting
function getInitialHistoryData(activePage) {
  let windowNode = null;

  if (activePage === "history") {
      windowNode = window;
  } else if (activePage === "home") {
      const iframeElem : any = document.getElementById("youtube-history-extension-frame");
      windowNode = iframeElem.contentWindow.window;
  }
  
  const ytInitialData : any = windowNode['ytInitialData'];
  const newlyWatchedVideos : any = objectGet(ytInitialData, "contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents");
  const continuationDataFetchingParams : any = objectGet(ytInitialData, "contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.continuations[0].nextContinuationData");
  const userDetails : string = objectGet(ytInitialData, "contents.twoColumnBrowseResultsRenderer.secondaryContents.browseFeedActionsRenderer.contents[3].buttonRenderer.navigationEndpoint.confirmDialogEndpoint.content.confirmDialogRenderer.dialogMessages[0].runs[0].text");
  const requestHeaders : any = getRequestHeaders(); 

  console.log('Extracted Initial User History Data : ', newlyWatchedVideos, continuationDataFetchingParams, ytInitialData);

  const data = {
      newlyWatchedVideos,
      continuationDataFetchingParams,
      userDetails,
      requestHeaders
  };
  
  const message : any = {
      type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.YOUTUBE_HISTORY_PAGE_INITIAL_DATA,
      data
  };
  
  const windowNodeToSendMessageTo = activePage === "history" ? window : window.parent;
  windowCommunicator.sendMessage(windowNodeToSendMessageTo, message);
}

// @forTesting
function getRequestHeaders() {
  const ytInitialData = window["ytInitialData"];
  const ytInitialGuideData = window["ytInitialGuideData"];
  const yt = window["yt"];

  const clickTrackingParams = objectGet(ytInitialData, "topbar.desktopTopbarRenderer.topbarButtons[4].topbarMenuButtonRenderer.menuRequest.clickTrackingParams");
  const trackingParams = objectGet(ytInitialData, "topbar.desktopTopbarRenderer.trackingParams");
  const csn = objectGet(ytInitialGuideData, "responseContext.webResponseContextExtensionData.ytConfigData.csn");
  const sessionToken = objectGet(yt, "config_.XSRF_TOKEN");
  const pageBuildLabel = objectGet(yt, "config_.PAGE_BUILD_LABEL");
  const youtubeClientVersion = objectGet(yt, "config_.INNERTUBE_CONTEXT_CLIENT_VERSION");
  const checksum = objectGet(yt, "config_.VARIANTS_CHECKSUM");
  const identityToken = objectGet(yt, "config_.ID_TOKEN");
  const pageCl = objectGet(yt, "config_.PAGE_CL");

  const headersData : IRequestHeaders = {
      clickTrackingParams,
      trackingParams,
      csn,
      sessionToken,
      pageBuildLabel,
      youtubeClientVersion,
      checksum,
      identityToken,
      pageCl
  };

  return headersData;
}

// @legacy
function getVideoPageDetails(message: IExtensionEventMessage) {
  const routeDetails: IRoute = message.route;
  const routingType: IRoutingType = routeDetails.routeType;

  if (routingType === IRoutingType.FROM_WITHIN_YOUTUBE) {
      getVideoPageDetailsForRoutedCase();
  } else {
      getVideoPageDetailsForDirectPageLoadCase();
  }
}

// @legacy
function getVideoPageDetailsForRoutedCase() {
  console.log(`\ngetVideoPageDetailsForRoutedCase()`);
}

// @legacy
function getVideoPageDetailsForDirectPageLoadCase() {
  console.log(`\ngetVideoPageDetailsForDirectPageLoadCase()`);
  const ytInitialData = window["ytInitialData"];
  const ytplayer = window["ytplayer"];

  if (!ytInitialData) {
      reportVariableAccessError(`ytInitialData does not exist`);
      return;
  }

  if (!ytplayer) {
      reportVariableAccessError(`ytplayer does not exist`);
      return;
  }

  const videoId: string = objectGet(ytInitialData, `currentVideoEndpoint.watchEndpoint.videoId`);
  const videoDetailsWrapper: any = objectGet(ytInitialData, `contents.twoColumnWatchNextResults.results.results.contents`);
  const title: string = objectGet(videoDetailsWrapper, `[0].videoPrimaryInfoRenderer.title.simpleText`);
  const description: string = objectGet(videoDetailsWrapper, `[1].videoSecondaryInfoRenderer.description.simpleText`);
  const channelName: string = objectGet(videoDetailsWrapper, `[1].videoSecondaryInfoRenderer.owner.videoOwnerRenderer.title.runs[0].text`);
  const totalDurationText: string = objectGet(ytplayer, `config.args.length_seconds`);
  const watchedOnDate: string = new Date().toISOString();
  const thumbnailUrl: string = objectGet(ytplayer, `videoDetails.thumbnail.thumbnails[3].url`);

  const videoDetails: any = {
      videoId,
      title,
      description,
      channel: {
          name: channelName,
          id: ""
      },
      totalDurationText,
      watchedOnDate
  };

  const message: any = {
      type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.VIDEO_DETAILS,
      data: videoDetails
  };

  windowCommunicator.sendMessage(window, message);
}

// @legacy
function getParamsRequiredForFetchingUserDetails() {
  const windowNode = window;
  const requestHeaders = getRequestHeaders()
  const message = {
      type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.DATA_FOR_FETCHING_USER_DETAILS,
      data: {
          ...requestHeaders
      }
  };

  console.log("Extracting data required to fetch user details : ", message);
  windowCommunicator.sendMessage(windowNode, message);
}

function objectGet (object, expression) {
  if (!object) {
      console.log(`Error : variableAccessScript.ts - ObjectGet() - Object is missing. Expression : `, expression);
      return;
  }

  if (!expression) {
      throw [`Expression is missing`, object];
  }
  
  return expression.trim().split('.').reduce(function (prev, curr) {
    var arr = curr.match(/(.*?)\[(.*?)\]/)
    if (arr) {
      return prev && (arr[1] !=="" ?  prev[arr[1]][arr[2]] : prev[arr[2]]);
    } else {
      return prev && prev[curr];
    }
  }, object)
}


function reportVariableAccessError(errorText) {
  const message: any = {
      type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.VARIABLE_ACCESS_ERROR,
      data: {
          errorText
      }
  };

  windowCommunicator.sendMessage(window, message);
}