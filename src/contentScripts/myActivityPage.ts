import appStrings from 'appStrings';
import { sendMessageToBackgroundScript, getActivePage } from 'common/utils';
import { APP_CONSTANTS } from 'appConstants';
import { IExtensionEventMessage, IYoutubeVideo, ActivePage, ExtensionModule } from 'interfaces';
import { startDataExtractionProcess } from 'contentScripts/services/initialHistoryExtractor';
import {
  loadExternalDataFetchingScript,
  sendMessageToVariableAccessScript
} from './services/variableScriptCommunicator';
import set = require('lodash/set');
import appGlobals from 'globals';
import ContinuationDataService from './services/continuationDataFetcher';

console.log('inside youtube history items page....initiating refresh cycle');

startContentScript();

function startContentScript() {
  window.onload = windowOnloadHandler;
  extensionMessageListener();
}

function windowOnloadHandler() {
  console.log(`Youtube History item page loaded...`);
  extractUserID();
}

function extensionMessageListener() {
  chrome.runtime.onMessage.addListener(handleMessageFromBackgroundScript);
}

async function handleMessageFromBackgroundScript(
  messages: IExtensionEventMessage[],
  sender: any,
  responseCallback: Function
) {
  console.log('inside handle messages from the backgroud script : ', messages, sender);
  if (!sender.tab) {
    messages.forEach((message) => {
      const messageType = message.type;
      const data: any = message.data;
      const userId: string = message.userId;

      switch (messageType) {
        case APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_INITIAL_YOUTUBE_HISTORY_DATA:
          const lastSavedVideoDetails: IYoutubeVideo = data;
          document.title = appStrings.myActivityPageNewTitle;
          startDataExtractionProcess(lastSavedVideoDetails);
          break;

        case APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_CONTINUATION_DATA:
          console.log('Fetch Continuation youtube history data');
          const { continuationDataFetchingParam } = data;
          ContinuationDataService.fetchNextContinuationData(
            continuationDataFetchingParam,
            userId,
            true
          );
          break;
      }
    });
  }
}

async function extractUserID() {
  console.log('inside extract user Id');
  await loadExternalDataFetchingScript(
    '/js/variableAccessScriptNew.js',
    variableAccessSriptMessageHandler
  );
  console.log(
    'inside start data extraction process...post wait for external script load and also some other work'
  );
  const activeUrl: string = window.location.href;
  const activePage: ActivePage = getActivePage(activeUrl);
  sendMessageToVariableAccessScript(
    {
      type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_USER_ID,
      activePage
    },
    ExtensionModule.ContentScript
  );
}

function variableAccessSriptMessageHandler(message: IExtensionEventMessage) {
  const { type, sender } = message;
  console.log('Message received from variable access script : ', message);

  if (sender === ExtensionModule.VariableAccessScript) {
    if (type === APP_CONSTANTS.DATA_EXCHANGE_TYPE.USER_ID) {
      postUserIdRetrivalFromVarAccessScript(message);
    }
  }
}

function postUserIdRetrivalFromVarAccessScript(message: IExtensionEventMessage) {
  console.log(
    'User Id received from variable access script. Sending it to background script',
    message.userId
  );
  const { data, userId } = message;
  const { isActiveUserLoggedIn, activeUserInPopup } = checkIfCorrectUserIsLoggedIn(userId);

  if (isActiveUserLoggedIn) {
    const { appVersion } = data;

    set(appGlobals, 'appVersion', appVersion);
    set(appGlobals, 'userId', userId);

    sendMessageToBackgroundScript(
      {
        type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.USER_ID,
        userId
      },
      ExtensionModule.ContentScript
    );
  } else {
    logInToActiveUserAccount(activeUserInPopup);
  }
}

function checkIfCorrectUserIsLoggedIn(loggedInUser: string) {
  const pageUrl: string = location.href;
  const decodedUrl: string = decodeURIComponent(pageUrl);
  const urlObj: URL = new URL(decodedUrl);
  const hash: string = urlObj.hash;
  let isActiveUserLoggedIn: boolean = true;
  let activeUserInPopup: string = '';

  if (hash) {
    const hashParts: string[] = hash.split('/');
    const encodedActiveUserInPopup: string = hashParts[1];

    if (encodedActiveUserInPopup) {
      activeUserInPopup = atob(encodedActiveUserInPopup);
      isActiveUserLoggedIn = activeUserInPopup === loggedInUser;
    }

    return {
      isActiveUserLoggedIn,
      activeUserInPopup
    };
  } else {
    return {
      isActiveUserLoggedIn,
      activeUserInPopup
    };
  }
}

function logInToActiveUserAccount(activeUserInPopup: string) {
  // TODO : move the selector in the constants file
  let userLoginDivs: any = document.querySelectorAll(`a .gb_Fb`);
  userLoginDivs = Array.from(userLoginDivs);
  let activeUserLoginDiv: HTMLDivElement = userLoginDivs.filter((userLoginDiv) => {
    return userLoginDiv.textContent.includes(activeUserInPopup);
  });

  if (!activeUserLoginDiv) {
    throw new Error('Unable to find the active user login div');
  }

  activeUserLoginDiv = activeUserLoginDiv[0];
  console.log('Active user login div : ', activeUserLoginDiv);

  const activeUserLoginDivParent: HTMLAnchorElement = activeUserLoginDiv.closest('a');
  activeUserLoginDivParent.click();
}
