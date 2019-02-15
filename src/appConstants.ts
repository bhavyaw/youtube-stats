
export const APP_CONSTANTS = {
    TIME_DIFFERENCE_BW_INITIAL_DATA_SAVES: 5, // minutes
    PROCESSES: {
        RUN_PRE_REFRESH_CHECKS: "RUN_PRE_REFRESH_CHECKS",
        HIGHLIGHT_TAB: "HIGHLIGHT_TAB",
        REFRESH_CYCLE_INITIATED: "REFRESH_CYCLE_INITIATED",
        MANUAL_RUN_REFRESH_CYCLE: "RUN_REFRESH_CYCLE",
        UPDATE_REFRESH_INTERVAL: "UPDATE_REFRESH_INTERVAL",
    },
    DATA_EXCHANGE_TYPE: {
        GET_CONTINUATION_DATA: "GET_CONTINUATION_DATA",
        CONTINUATION_DATA: "CONTINUATION_DATA",
        GET_ACTIVE_USER_DETAILS: "GET_ACTIVE_USER_DETAILS",
        ACTIVE_USER_DETAILS: "ACTIVE_USER_DETAILS",
        GET_DATA_FOR_FETCHING_USER_DETAILS: "GET_DATA_FOR_FETCHING_USER_DETAILS",
        DATA_FOR_FETCHING_USER_DETAILS: "DATA_FOR_FETCHING_USER_DETAILS",
        GET_SESSION_TOKEN: "GET_SESSION_TOKEN",
        SESSION_TOKEN: "SESSION_TOKEN",
        GET_REMAINING_INITIAL_DATA: "GET_REMAINING_INITIAL_DATA",
        REMAINING_INITIAL_DATA: "REMAINING_INITIAL_DATA",
        GET_VIDEO_DETAILS: "GET_VIDEO_DETAILS",
        VIDEO_DETAILS: "VIDEO_DETAILS",
        ERROR: "ERROR",
        GET_INITIAL_YOUTUBE_HISTORY_DATA: "GET_INITIAL_YOUTUBE_HISTORY_DATA",
        INITIAL_YOUTUBE_HISTORY_DATA: "INITIAL_YOUTUBE_HISTORY_DATA",
        INITIAL_DATA: "INITIAL_DATA",
        GET_USER_ID: "GET_USER_ID",
        USER_ID: "USER_ID",
        HISTORY_DATA_UPDATED: "HISTORY_DATA_UPDATED",
        FETCH_STATS_FOR_INTERVAL: "FETCH_STATS_FOR_INTERVAL"
    },
    RECEIVER: {
        POPUP: "POPUP",
        CONTENT_SCRIPT: "CONTENT_SCRIPT",
        BACKGROUND: "BACKGROUND"
    },
    SENDER: {
        POPUP: "POPUP",
        CONTENT_SCRIPT: "CONTENT_SCRIPT",
        BACKGROUND: "BACKGROUND"
    },
    CONTINUATION_DATA_END: "CONTINUATION_DATA_END"
};

export const DATA_FETCHING_URLS = {
    CONTINUATION: "/item?restrict=ytw&hl=en-GB&jspb=1"
};
Object.freeze(APP_CONSTANTS);
Object.freeze(DATA_FETCHING_URLS);