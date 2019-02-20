import { IExtensionEventMessage, INewInitialHistoryData, IYoutubeVideo } from 'models';
import { APP_CONSTANTS } from 'appConstants';
import { storeAsync as store } from 'chrome-utils';
import YoutubeHistory from './YoutubeHistory';
import { appConfig, StatsIntervalOptions } from 'config';

import isNil = require("lodash/isNil");
import isEmpty = require('lodash/isEmpty');
import isDate = require("lodash/isDate");
import appStrings from 'appStrings';
import { isNumber } from 'lodash';
import YoutubeHistoryStats from './services/YoutubeHistoryStats';

// @priority : high
// TODO : close the opened tab once both the initial history extraction and continuation data fetching processes are complete

// @priority : medium
// TODO : catch and handle error gracefully occuring throughout the app

console.log("inside background script!!! of youtube history chrome extension", store);

// background js globals
let stopFetchingContinuationData = false;
let lastRun: Date = null;
// To take care of the missing messages
const messageQueue: Set<IExtensionEventMessage> = new Set();
let activityControlsTabId: number = 0;

initialize();

function initialize() {
  console.log("Initializing Background script...");
  runRefreshCycle();
  listenToTabEvents();
  chrome.runtime.onMessage.addListener(function (message: IExtensionEventMessage, sender: any, sendResponseFunc: Function) {
    if (message.sender === APP_CONSTANTS.SENDER.POPUP) {
      (handleMessagesFromPopupScript as any)(...arguments);
    } else {
      (handleMessagesFromContentScript as any)(...arguments);
    }
    return true;
  });
}

function onInstallHandler() {
  // @priority - very low
  // TODO : create simple interface for notifications
  chrome.notifications.create({
    message: `Running Refresh Cycle | Opening activity control tab`,
    type: `basic`,
    iconUrl: `../icon48.png`,
    title: `Testing Notifications`
  });

  chrome.tabs.create({
    active: false,
    pinned: true,
    index: 0,
    url: `https://myaccount.google.com/activitycontrols`,
  }, (tab: chrome.tabs.Tab) => {
    activityControlsTabId = tab.id;
  });
}

function listenToTabEvents() {
  const activityControlsPageUrlRegex = /myaccount\.google\.com\/(intro\/)?activitycontrols$/i;

  chrome.tabs.onUpdated.addListener((tabId: number, info: any, tab: any) => {
    if (info.status === 'complete') {
      console.log(`Tab updated  : `, info, tab);
      const url: URL = new URL(tab.url);
      const completeUrl: string = url.host + url.pathname;

      if (activityControlsPageUrlRegex.test(completeUrl) && tab.title === "Activity controls" && tab.id === activityControlsTabId) {
        console.log("Activity controls tab opened via extension programmatically");
        runPreRefreshCycleChecks(tab);
      }
    }
  });

  chrome.tabs.onRemoved.addListener(function (closedTabId) {
    if (closedTabId === activityControlsTabId) {
      activityControlsTabId = 0;
    }
  });
}

async function handleMessagesFromContentScript(message: IExtensionEventMessage, sender: any, sendResponseFunc: Function): Promise<any> {
  console.log("inside content script message handler : ", message, sender);
  if (sender.tab) {
    const messageType: string = message.type;
    const data: any = message.data;
    const tab: chrome.tabs.Tab = sender.tab;
    const tabId: number = tab.id;
    const userId: string = message.userId;

    switch (messageType) {
      case APP_CONSTANTS.PROCESSES.HIGHLIGHT_TAB:
        console.log("Handle user logged out...", sender);
        chrome.tabs.update(tabId, {
          active: true
        }, () => { });

        break;

      case APP_CONSTANTS.DATA_EXCHANGE_TYPE.USER_ID:
        console.log("Received userId from the content script", userId);
        if (userId && tabId === activityControlsTabId) {
          lastRun = new Date();
          const lastSavedVideo = await store.get(`lastSavedVideo.${userId}`);
          const savedContinuationDataFetchingParam = await store.get(`continuation.${userId}`);

          console.log("Last saved video was : ", lastSavedVideo);
          sendMessageToActiveTab(tabId, {
            type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_INITIAL_YOUTUBE_HISTORY_DATA,
            data: {
              ...lastSavedVideo
            }
          });

          if (savedContinuationDataFetchingParam && savedContinuationDataFetchingParam !== APP_CONSTANTS.CONTINUATION_DATA_END) {
            fetchContinuationData(tabId, userId, savedContinuationDataFetchingParam);
          }
        }
        break;

      case APP_CONSTANTS.DATA_EXCHANGE_TYPE.INITIAL_YOUTUBE_HISTORY_DATA:
        console.log("initial data received from content script : ", data);
        saveInitialHistoryData(tabId, data, userId, lastRun);
        break;

      case APP_CONSTANTS.DATA_EXCHANGE_TYPE.CONTINUATION_DATA:
        console.log("Continuation data received from content script : ", data);
        saveContinuationData(tabId, data, userId, lastRun);
        break;
    }
  }
}

async function handleMessagesFromPopupScript(message: IExtensionEventMessage, sender, sendResponseFunc) {
  console.log(`Handling messages from popup script : `, message);

  const messageType: string = message.type;
  const data: any = message.data;

  switch (messageType) {
    case APP_CONSTANTS.PROCESSES.MANUAL_RUN_REFRESH_CYCLE:
      console.log(`Manually running refresh cycle for user`);
      runRefreshCycle();
      break;

    case APP_CONSTANTS.PROCESSES.UPDATE_REFRESH_INTERVAL:
      const newRefreshInterval: number = data.newRefreshInterval;
      updateRefreshInterval(newRefreshInterval, sendResponseFunc);
      break;

    case APP_CONSTANTS.DATA_EXCHANGE_TYPE.FETCH_STATS_FOR_INTERVAL:
      const { statsInterval, date, loadCount, userId }: { statsInterval: StatsIntervalOptions, date, loadCount: number, userId: string } = data;
      console.log(`Generating stats for interval :`, statsInterval, date);
      const historyStats: any = await YoutubeHistoryStats.getStatsForInterval(statsInterval, date, userId, loadCount);
      sendResponseFunc(historyStats);
  }
}

// NOTE : refresh interval cannot be per user because we get userId after opening the tab and not before
async function runRefreshCycle() {
  console.log(`\n====> Inside run refresh cycle...\n`);
  const lastRunString: string = await store.get(`lastRun`);
  let activeRefreshInterval: number = await store.get(`activeRefreshInterval`);
  const lastIntervalChangeDateString: string = await store.get(`activeIntervalChangeDate`);

  activeRefreshInterval = activeRefreshInterval || appConfig.defaultRefreshInterval;

  const lastRunDate: Date = new Date(lastRunString);
  const lastIntervalChangeDate: Date = new Date(lastIntervalChangeDateString);
  let runRefreshCycle: boolean = false; // first time

  if (isDate(lastIntervalChangeDate)) {
    runRefreshCycle = checkRefreshCycle(lastIntervalChangeDate, activeRefreshInterval);
  } else if (isDate(lastRunDate)) {
    runRefreshCycle = checkRefreshCycle(lastRunDate, activeRefreshInterval);
  }

  /**
   * TODO : currently we make sure that no refresh cycle is currently running by checking activity control tab is open,
   * if it is open we assume that the refresh cycle is running and we don't run any new refresh cycle.
   * Later if time : Actually check whether the refresh cycle is running in the open tab by some means...and if not then re-run refresh 
   * in the tab only by refreshing it
   */

  if (activityControlsTabId) {
    chrome.notifications.create({
      message: appStrings.alreadyRefreshing,
      type: `basic`,
      title: `Notice`,
      iconUrl: `../icon48.png`
    });
    return;
  }
  if (runRefreshCycle) {
    onInstallHandler();
  }
}

function runPreRefreshCycleChecks(activeTab: chrome.tabs.Tab) {
  console.log("running prerefresh cycle checks", activeTab, activityControlsTabId);
  if (activeTab.id === activityControlsTabId) {
    const message: IExtensionEventMessage = {
      type: APP_CONSTANTS.PROCESSES.RUN_PRE_REFRESH_CHECKS,
    };

    sendMessageToActiveTab(activeTab.id, message);
  }
}

async function updateRefreshInterval(newRefreshInterval: number, sendResponseFunc) {
  if (newRefreshInterval && isNumber(newRefreshInterval)) {
    try {
      await store.set(`refreshInterval`, newRefreshInterval);
      const refreshIntervalUpdateTime: Date = new Date();
      const refreshIntervalUpdateTimeString: string = refreshIntervalUpdateTime.toISOString();
      await store.set(`activeIntervalChangeDate`, refreshIntervalUpdateTimeString);

      sendResponseFunc({
        newRefreshInterval
      });
    } catch (error) {
      chrome.notifications.create({
        message: `Some error occured in updating refresh Interval`,
        type: "basic",
        title: "Error",
        iconUrl: `../icon48.png`
      });
    }
  } else {
    throw new Error(`No refresh interval or incorrect received from popup.ts : ${newRefreshInterval}`);
  }
}

async function saveInitialHistoryData(activeTabId: number, latestHistoryData: INewInitialHistoryData, userId: string, lastRun: Date) {
  console.log(" SaveInitialHistoryData() : New initial History to save", latestHistoryData, userId, "\n\n");
  const youtubeHistory: YoutubeHistory = new YoutubeHistory(latestHistoryData, userId, lastRun);
  const newContinuationDataFetchingParam: string = youtubeHistory.continuationDataFetchingParam;
  await youtubeHistory.updateVideoHistory();

  // // First time data saving case only
  const savedContinuationDataFetchingParam = await store.get(`continuation.${userId}`);
  // only when there's no continuation data i.e first time --> save continuation data and fetch continuation data
  // rest of the times it will happen of its own
  if (isNil(savedContinuationDataFetchingParam) && !stopFetchingContinuationData) {
    console.log(`SaveInitialHistoryData() : No saved continuation data fetching parameters found...saving c.d.f.p`, "\n\n");
    if (!isNil(newContinuationDataFetchingParam)) {
      await youtubeHistory.updateContinuationDataFetchingParam();
      console.log(`SaveInitialHistoryData() : Saving new Continuation Data Fetching Param`, "\n\n");
      fetchContinuationData(activeTabId, userId, newContinuationDataFetchingParam);
      return;
    }
  }
}


async function fetchContinuationData(activeTabId: number, userId: string, continuationDataFetchingParam: string) {
  // continuation data can be fetched from ony of the three pages
  // if continuation data fetching is in progress then do entertain any further requests
  // after fetching continuation data save it, after saving it, again try fetching the continuation data from the same tab if active otherwise pick some other tab
  console.log(`fetchContinuationData() :`, continuationDataFetchingParam, userId, "\n\n");

  if (isEmpty(userId)) {
    throw new Error(`Inside fetch continuation data, userId is null ${userId}`);
  }

  const message: IExtensionEventMessage = {
    type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_CONTINUATION_DATA,
    data: {
      continuationDataFetchingParam
    },
    userId
  };

  console.log(`fetchContinuationData() : continuationDataFetchingParam exists....fetching continuation data now`, "\n\n");
  sendMessageToActiveTab(activeTabId, message);
}


async function saveContinuationData(activeTabId: any, continuationData: INewInitialHistoryData, userId: string, lastRun: Date) {
  const youtubeHistory: YoutubeHistory = new YoutubeHistory(continuationData, userId, lastRun);
  const newlyWatchedVideos: IYoutubeVideo[] = youtubeHistory.historyDataArr;
  const newContinuationDataFetchingParam: string = youtubeHistory.continuationDataFetchingParam;

  try {
    if (!isEmpty(newlyWatchedVideos)) {
      await youtubeHistory.updateContinuationData();
    }

    await youtubeHistory.updateContinuationDataFetchingParam();

    if (newContinuationDataFetchingParam && newContinuationDataFetchingParam !== APP_CONSTANTS.CONTINUATION_DATA_END) {
      if (!stopFetchingContinuationData) {
        console.log(` saveContinuationData() : Fetching continuation data from inside of Save Continuation data...`, "\n\n");
        fetchContinuationData(activeTabId, userId, newContinuationDataFetchingParam);
      }
    }
  } catch (e) {
    console.log("Some error occurred in saving continuation data :", e);
    throw new Error("Some error occured in saving continuation data");
  }
}

function sendMessageToActiveTab(preferableTabId: number, message: IExtensionEventMessage) {
  messageQueue.add(message);

  chrome.tabs.get(preferableTabId, (preferableTab: chrome.tabs.Tab) => {
    const messagesToSend = [...messageQueue];

    if (preferableTab) {
      chrome.tabs.sendMessage(preferableTab.id, messagesToSend)
    }
    messageQueue.clear();
  });
}

// TODO : better nomenclature
function checkRefreshCycle(dateToCompare: Date, activeRefreshInterval: number) {
  const activeRefreshIntervalTimeInMs: number = activeRefreshInterval * 24 * 60 * 60 * 1000;
  let currentDate: Date = new Date();
  currentDate = new Date(currentDate.setHours(0, 0, 0, 0));
  dateToCompare = new Date(dateToCompare.setHours(0, 0, 0, 0));

  return ((currentDate.valueOf() - dateToCompare.valueOf()) > activeRefreshIntervalTimeInMs);
}


function toggleStopFetchingCont() {
  stopFetchingContinuationData = !stopFetchingContinuationData;
  console.log(`Current value of stop fetching continuation data : `, stopFetchingContinuationData);
}

console.log(toggleStopFetchingCont);