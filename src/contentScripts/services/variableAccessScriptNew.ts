import { IExtensionEventMessage, IRequestHeaders, IRoute, IRoutingType } from "models";


class WindowCommunicator {
    listeners: Function[] = [];
    targetUrl: string = "";
    listenerAlreadyExist: boolean = false;

    constructor() {
        this.targetUrl = location.protocol + "//" + location.hostname;
        console.log(`Inside window communicator constructor : `, this.targetUrl);
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
        windowNode.postMessage(message, targetUrl);
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
    const {type : contentType} = message;

    console.log(`Message received from CONTENT SCRIPT :`, contentType, "\n\n");
    switch (contentType) {
        case APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_DATA_FOR_FETCHING_USER_DETAILS:
            getParamsRequiredForFetchingUserDetails();
            break;

        case APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_INITIAL_YOUTUBE_HISTORY_DATA:
            const activePage = message.activePage;
            getInitialHistoryData(activePage);
            break;

        case APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_VIDEO_DETAILS:
            getVideoPageDetails(message);
            break;

        case APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_USER_ID:
            getUserId();
            break;
    }
}

function getUserId() {
    let windowNode = window;
    const userId: string = windowNode['HISTORY_account_email'];
    const appVersion: string = windowNode['HISTORY_version'];

    windowCommunicator.sendMessage(window, {
        type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.USER_ID,
        userId,
        data: {
            appVersion
        }
    });
}

// main 
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

function getInitialHistoryData(activePage) {
    let windowNode = window;
    let ytInitialData: any = windowNode['HISTORY_response'];
    let userId: string = windowNode['HISTORY_account_email'];
    let newlyWatchedVideos: any[] = [];
    let continuationDataFetchingParam: string = "";

    if (!ytInitialData) {
        windowCommunicator.sendMessage(window, {
            type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.ERROR,
            error_msg: `Initial History data missing`
        });
    }

    try {
        ytInitialData = JSON.parse(ytInitialData);
        newlyWatchedVideos = ytInitialData[0] && ytInitialData[0].slice();
        continuationDataFetchingParam = ytInitialData[1];
    } catch (error) {
        windowCommunicator.sendMessage(window, {
            type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.ERROR,
            error_msg: `Some error occurred in parsing/extracting initial data ${error.toString()}`
        });
    }

    windowCommunicator.sendMessage(window, {
        type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.INITIAL_YOUTUBE_HISTORY_DATA,
        data: {
            newlyWatchedVideos,
            continuationDataFetchingParam
        },
        userId
    });

    windowNode['HISTORY_response'] = null;

}

// function getInitialHistoryDataLegacy(activePage) {
//     let windowNode = null;

//     if (activePage === "history") {
//         windowNode = window;
//     } else if (activePage === "home") {
//         const iframeElem : any = document.getElementById("youtube-history-extension-frame");
//         windowNode = iframeElem.contentWindow.window;
//     }

//     const ytInitialData : any = windowNode['ytInitialData'];
//     const newlyWatchedVideos : any = objectGet(ytInitialData, "contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents");
//     const continuationDataFetchingParams : any = objectGet(ytInitialData, "contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.continuations[0].nextContinuationData");
//     const userDetails : string = objectGet(ytInitialData, "contents.twoColumnBrowseResultsRenderer.secondaryContents.browseFeedActionsRenderer.contents[3].buttonRenderer.navigationEndpoint.confirmDialogEndpoint.content.confirmDialogRenderer.dialogMessages[0].runs[0].text");
//     const requestHeaders : any = getRequestHeaders(); 

//     console.log('Extracted Initial User History Data : ', newlyWatchedVideos, continuationDataFetchingParams, ytInitialData);

//     const data : INewInitialHistoryData = {
//         newlyWatchedVideos,
//         continuationDataFetchingParams,
//         userDetails,
//         requestHeaders
//     };

//     const message = {
//         type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.INITIAL_DATA,
//         data
//     };

//     const windowNodeToSendMessageTo = activePage === "history" ? window : window.parent;
//     windowCommunicator.sendMessage(windowNodeToSendMessageTo, message);
// }

function getVideoPageDetails(message: IExtensionEventMessage) {
    const routeDetails: IRoute = message.route;
    const routingType: IRoutingType = routeDetails.routeType;

    if (routingType === IRoutingType.FROM_WITHIN_YOUTUBE) {
        getVideoPageDetailsForRoutedCase();
    } else {
        getVideoPageDetailsForDirectPageLoadCase();
    }
}

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

    const message: IExtensionEventMessage = {
        type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.VIDEO_DETAILS,
        data: videoDetails
    };

    windowCommunicator.sendMessage(window, message);
}

function getVideoPageDetailsForRoutedCase() {
    console.log(`\ngetVideoPageDetailsForRoutedCase()`);
}

function reportVariableAccessError(errorText) {
    const message: IExtensionEventMessage = {
        type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.VARIABLE_ACCESS_ERROR,
        data: {
            errorText
        }
    };

    windowCommunicator.sendMessage(window, message);
}
/**
 * Request headers data is always found in the main window and not the iframe window
 */
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

    const headersData: IRequestHeaders = {
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

// utils 

function objectGet(object, expression) {
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
            return prev && (arr[1] !== "" ? prev[arr[1]][arr[2]] : prev[arr[2]]);
        } else {
            return prev && prev[curr];
        }
    }, object)
}

const APP_CONSTANTS = {
    TIME_DIFFERENCE_BW_INITIAL_DATA_SAVES: 5,
    DATA_EXCHANGE_TYPE: {
        GET_INITIAL_DATA: "GET_INITIAL_DATA",
        INITIAL_DATA: "INITIAL_DATA",
        GET_CONTINUATION_DATA: "GET_CONTINUATION_DATA",
        GET_ACTIVE_USER_DETAILS: "GET_ACTIVE_USER_DETAILS",
        ACTIVE_USER_DETAILS: "ACTIVE_USER_DETAILS",
        GET_DATA_FOR_FETCHING_USER_DETAILS: "GET_DATA_FOR_FETCHING_USER_DETAILS",
        DATA_FOR_FETCHING_USER_DETAILS: "DATA_FOR_FETCHING_USER_DETAILS",
        GET_VIDEO_DETAILS: "GET_VIDEO_DETAILS",
        VIDEO_DETAILS: "VIDEO_DETAILS",
        VARIABLE_ACCESS_ERROR: "VARIABLE_ACCESS_ERROR",
        GET_USER_ID: "GET_USER_ID",
        USER_ID: "USER_ID",
        GET_INITIAL_YOUTUBE_HISTORY_DATA: "GET_INITIAL_YOUTUBE_HISTORY_DATA",
        INITIAL_YOUTUBE_HISTORY_DATA: "INITIAL_YOUTUBE_HISTORY_DATA",
        ERROR: "ERROR"
    }
};

Object.freeze(APP_CONSTANTS);