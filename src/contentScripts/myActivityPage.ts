import appStrings from 'appStrings';
import { sendMessageToBackgroundScript, convertUserIdToSavableForm } from 'common/utils';
import { APP_CONSTANTS } from "appConstants";
import { IExtensionEventMessage, IYoutubeVideo } from "models";
import { startDataExtractionProcess } from "contentScripts/services/initialHistoryExtractor";
import { loadExternalDataFetchingScript, sendMessageToVariableAccessScript } from "./services/variableScriptCommunicator";
import set = require('lodash/set');
import appGlobals from 'globals';
import ContinuationDataService from "./services/continuationDataFetcher";

console.log("inside youtube history items page....initiating refresh cycle");

startContentScript();

function startContentScript() {
  window.onload = windowOnloadHandler;
  extensionMessageListener();
}

function windowOnloadHandler() {
  console.log(`Youtube History item page loaded...`);
  sendUserIdToBackgroundScript();
}

function extensionMessageListener() {
  chrome.runtime.onMessage.addListener(handleMessageFromBackgroundScript);
}

async function handleMessageFromBackgroundScript(messages: IExtensionEventMessage[], sender: any, responseCallback: Function) {
  console.log("inside handle messages from the backgroud script : ", messages, sender);
  if (!sender.tab) {
    messages.forEach(message => {
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
          console.log("Fetch Continuation youtube history data");
          const { continuationDataFetchingParam } = data;
          ContinuationDataService.fetchNextContinuationData(continuationDataFetchingParam, userId, true);
          break;
      }
    });
  }
}

async function sendUserIdToBackgroundScript() {
  console.log("inside extract user Id");
  await loadExternalDataFetchingScript('/js/variableAccessScriptNew.js', (variableAccessSriptMessageHandler));
  console.log("inside start data extraction process...post wait for external script load and also some other work");
  sendMessageToVariableAccessScript({
    type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_USER_ID
  });
}

function variableAccessSriptMessageHandler(message) {
  const type = message.type;
  console.log("Message received from variable access script : ", message);

  if (type === APP_CONSTANTS.DATA_EXCHANGE_TYPE.USER_ID) {
    console.log("User Id received from variable access script. Sending it to background script", message.userId);
    let { data, userId } = message;
    userId = convertUserIdToSavableForm(userId);
    const { appVersion } = data;

    set(appGlobals, "appVersion", appVersion);
    set(appGlobals, "userId", userId);

    sendMessageToBackgroundScript({
      type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.USER_ID,
      userId
    });
  }
}