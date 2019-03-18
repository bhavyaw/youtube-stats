import { IExtensionEventMessage, IRequestHeaders, IRoute, IRoutingType, ActivePage, ExtensionModule } from "models";


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
    windowCommunicator.addListener(window, handleMessageFromContentScript);
}

function handleMessageFromContentScript(event) {
    const message: IExtensionEventMessage = event.data;
    const {type : contentType, activePage, sender} = message;

    if (sender === ExtensionModule.ContentScript) {
        console.log(`Message received from CONTENT SCRIPT :`, contentType, "\n\n");
        switch (contentType) {
            case APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_INITIAL_YOUTUBE_HISTORY_DATA:
                getInitialHistoryData(activePage);
                break;
    
            case APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_USER_ID:
                getUserId(activePage);
                break;
        }
    }
}

function getUserId(activePage : ActivePage) {
    console.log(`getUserId() : `, activePage);
    let windowNode = window;
    let userId : string, data : any;

    if (activePage === ActivePage.activityControls) {
        userId = windowNode["WIZ_global_data"]["oPEP7c"];
    } else if(activePage === ActivePage.myActivity) {
        userId = windowNode['HISTORY_account_email'];
        const appVersion: string = windowNode['HISTORY_version'];
        data = {appVersion};
    }

    windowCommunicator.sendMessage(window, {
        type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.USER_ID,
        userId,
        data
    });
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

function reportVariableAccessError(errorText) {
    const message: any = {
        type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.VARIABLE_ACCESS_ERROR,
        data: {
            errorText
        }
    };

    windowCommunicator.sendMessage(window, message);
}

// utils 

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