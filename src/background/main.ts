import { IExtensionEventMessage, INewInitialHistoryData, IYoutubeVideo, ExtensionModule, StatsIntervalOptions } from 'models';
import { APP_CONSTANTS } from 'appConstants';
import { storeAsync as store } from 'chrome-utils';
import YoutubeHistory from './YoutubeHistory';
import { appConfig } from 'config';

import isNil = require("lodash/isNil");
import isEmpty = require('lodash/isEmpty');
import isDate = require("lodash/isDate");
import { isNumber, uniq } from 'lodash';
import YoutubeHistoryStats from './services/YoutubeHistoryStats';
import { showDesktopNotification } from 'common/utils';
import appStrings from 'appStrings';
import baseModel from 'models/BaseModel';

// background js globals
let stopFetchingContinuationData = false;
let lastRun: Date = null;
let activityControlsTabId: number = 0;
let newSelectedUserInPopup : string = "";
// To take care of the missing messages
const messageQueue: Set<IExtensionEventMessage> = new Set();

initializeBackgroundScript();

const storeRemove = store.remove;

function initializeBackgroundScript() {
  console.log("Initializing Background script...", store, storeRemove, baseModel);
  // browser start event 
  // TODO : enable this in production
  // chrome.runtime.onStartup.addListener(async () => {
  // });

  handleBrowserStartEvent();
}

function handleBrowserStartEvent() {
  // showDesktopNotification(`Browser has started!!!`);
  intiateRefreshCycle();
  listenToTabEvents();
  chrome.runtime.onMessage.addListener(function (message: IExtensionEventMessage, sender: any, sendResponseFunc: Function) {
    if (message.sender === ExtensionModule.Background) {
      (handleMessagesFromPopupScript as any)(...arguments);
    } else {
      (handleMessagesFromContentScript as any)(...arguments);
    }
    return true;
  });
}

function runRefreshCycle() {
  if (activityControlsTabId) {
    showDesktopNotification(appStrings.alreadyRefreshing, 'Notice');
    return;
  }

  // showDesktopNotification(`Running Refresh Cycle | Opening activity control tab`, "Testing Notification");
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
  const activityControlsPageUrlRegex = /myaccount\.google\.com\/(u\/\d\/|intro\/)?activitycontrols$/i;
  const myActivityPageRegex = /myactivity.google.com\/item/i;

  chrome.tabs.onUpdated.addListener((tabId: number, info: any, tab: any) => {
    if (info.status === 'complete') {
      console.log(`Tab updated  : `, tab);
      const url: URL = new URL(tab.url);
      const completeUrl: string = url.host + url.pathname;
      const urlHash : string = url.hash;

      if (activityControlsPageUrlRegex.test(completeUrl)) {
        console.log("Activity controls tab opened via extension programmatically");
        if (tab.id === activityControlsTabId) {
          runPreRefreshCycleChecks(tab);
        } else if (urlHash === appStrings.extensionUrlHash) {
          // delete stale extraction tabs
          chrome.tabs.remove(tab.id);
        }
      } 

      if (myActivityPageRegex.test(completeUrl) && tab.id !== activityControlsTabId && urlHash.includes(appStrings.extensionUrlHash)) {
        console.log(`MyActivity tab opened by extension`, tab);
        // delete stale extraction tabs
        chrome.tabs.remove(tab.id);
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
      case APP_CONSTANTS.DATA_EXCHANGE_TYPE.OTHER_USERS : 
        const {users} : {users : Array<string>} = data;
        console.log(`Received other users from activity controls pages`, users);
        saveOtherUsers(users);
      break;

      case APP_CONSTANTS.PROCESSES.HIGHLIGHT_TAB:
        console.log("Handle user logged out...", sender);
        chrome.tabs.update(tabId, {
          active: true
        }, () => {});

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

      case APP_CONSTANTS.PROCESSES.SHOW_DESKTOP_NOTIFICATION : 
        const {message, title} = data;
        showDesktopNotification(message, title);
    }
  }
}

async function saveOtherUsers(users : Array<string>) {
  const existingUsers = await store.get("users") || [];
  let newUsersToStore : Array<string> = uniq(existingUsers.concat(users));
  console.log("Existing users : %o, New Extracted Users : %o, New users to save : %o",existingUsers, users, newUsersToStore);

  if (existingUsers.length !== newUsersToStore.length) {
    console.log("Saving new users in store : ", newUsersToStore);
    await store.set("users", newUsersToStore);
  }
}

async function handleMessagesFromPopupScript(message: IExtensionEventMessage, sender, sendResponseFunc) {
  console.log(`Handling messages from popup script : `, message);

  const {data, userId, type : messageType} = message;

  switch (messageType) {
    case APP_CONSTANTS.PROCESSES.MANUAL_RUN_REFRESH_CYCLE:
      console.log(`Manually running refresh cycle for user`, userId);
      newSelectedUserInPopup = userId;
      intiateRefreshCycle();
      break;

    case APP_CONSTANTS.PROCESSES.UPDATE_REFRESH_INTERVAL:
      const newRefreshInterval: number = data.newRefreshInterval;
      updateRefreshInterval(newRefreshInterval, sendResponseFunc);
      break;

    case APP_CONSTANTS.DATA_EXCHANGE_TYPE.FETCH_STATS_FOR_INTERVAL:
      const { selectedStatsInterval, selectedDate, loadCount, selectedUserId }: { selectedStatsInterval: StatsIntervalOptions, selectedDate, loadCount: number, selectedUserId: string } = data;
      console.log(`Generating stats for interval :`, selectedStatsInterval, selectedDate);
      try {
        const historyStats: any = await YoutubeHistoryStats.getStatsForInterval(selectedStatsInterval, selectedDate, selectedUserId, loadCount);
        const lastSavedStatsInterval : number = await store.get(`lastAccessedStatsInterval`);
        if (!lastSavedStatsInterval || (lastSavedStatsInterval && lastSavedStatsInterval !== selectedStatsInterval)) {
          await store.set(`lastAccessedStatsInterval`, selectedStatsInterval);
        }
        sendResponseFunc(historyStats);
      } catch (error) {
        throw error;
      }
  }
}

// NOTE : refresh interval cannot be per user because we get userId after opening the tab and not before
async function intiateRefreshCycle() {
  console.log(`\n====> Inside run refresh cycle...\n`);
  const lastRunString: string = await store.get(`lastRun`);
  let activeRefreshInterval: number = await store.get(`activeRefreshInterval`);
  const lastIntervalChangeDateString: string = await store.get(`activeIntervalChangeDate`);

  activeRefreshInterval = activeRefreshInterval || appConfig.defaultRefreshInterval;

  const lastRunDate: Date = new Date(lastRunString);
  const lastIntervalChangeDate: Date = new Date(lastIntervalChangeDateString);
  let shouldRunRefreshCycle: boolean = false; // first time

  if (isDate(lastIntervalChangeDate)) {
    shouldRunRefreshCycle = canRunRefreshCycle(lastIntervalChangeDate, activeRefreshInterval);
  } else if (isDate(lastRunDate)) {
    shouldRunRefreshCycle = canRunRefreshCycle(lastRunDate, activeRefreshInterval);
  }

  /**
   * TODO : currently we make sure that no refresh cycle is currently running by checking activity control tab is open,
   * if it is open we assume that the refresh cycle is running and we don't run any new refresh cycle.
   * Later if time : Actually check whether the refresh cycle is running in the open tab by some means...and if not then re-run refresh 
   * in the tab only by refreshing it
   */
  
  if (shouldRunRefreshCycle) {
    runRefreshCycle();
  }
}

function runPreRefreshCycleChecks(activeTab: chrome.tabs.Tab) {
  console.log("running prerefresh cycle checks", activeTab, activityControlsTabId);
  if (activeTab.id === activityControlsTabId) {
    const message: IExtensionEventMessage = {
      type: APP_CONSTANTS.PROCESSES.RUN_PRE_REFRESH_CHECKS,
      sender : ExtensionModule.Background
    };

    if (!isEmpty(newSelectedUserInPopup)) {
      Object.assign(message, {
        userId : newSelectedUserInPopup
      });
    }

    sendMessageToActiveTab(activeTab.id, message);
  }
}

async function updateRefreshInterval(newRefreshInterval: number, sendResponseFunc) {
  if (newRefreshInterval && isNumber(newRefreshInterval)) {
    try {
      await store.set(`activeRefeshInterval`, newRefreshInterval);
      const refreshIntervalUpdateTime: Date = new Date();
      const refreshIntervalUpdateTimeString: string = refreshIntervalUpdateTime.toISOString();
      await store.set(`activeIntervalChangeDate`, refreshIntervalUpdateTimeString);

      sendResponseFunc({
        newRefreshInterval
      });
    } catch (error) {
      showDesktopNotification("Some error occured in updating refresh Interval", "Error");
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

  const message : any = {
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
    await youtubeHistory.updateContinuationDataFetchingParam();

    if (!isEmpty(newlyWatchedVideos)) {
      await youtubeHistory.updateContinuationData();

      if (newContinuationDataFetchingParam && newContinuationDataFetchingParam !== APP_CONSTANTS.CONTINUATION_DATA_END && !stopFetchingContinuationData) {
          console.log(` saveContinuationData() : Fetching continuation data from inside of Save Continuation data...`, "\n\n");
          fetchContinuationData(activeTabId, userId, newContinuationDataFetchingParam);
      }
    }
  } catch (e) {
    console.log("Some error occurred in saving continuation data :", e);
    throw new Error("Some error occured in saving continuation data");
  }
}

function sendMessageToActiveTab(preferableTabId: number, message) {
  const messageToSend : IExtensionEventMessage = {
    ...message,
    sender : ExtensionModule.Background
  };
  messageQueue.add(messageToSend);

  chrome.tabs.get(preferableTabId, (preferableTab: chrome.tabs.Tab) => {
    const messagesToSend = [...messageQueue];

    if (preferableTab) {
      chrome.tabs.sendMessage(preferableTab.id, messagesToSend)
    }
    messageQueue.clear();
  });
}

// TODO : better nomenclature
function canRunRefreshCycle(dateToCompare: Date, activeRefreshInterval: number) {
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