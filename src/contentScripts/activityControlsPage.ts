import { IExtensionEventMessage, ActivePage, ExtensionModule } from "models";
import { APP_CONSTANTS } from "appConstants";
import { sendMessageToBackgroundScript, convertUserIdToOriginalForm, getActivePage } from "common/utils";
import { delegate } from 'receptor';
import appStrings from "appStrings";
import { loadExternalDataFetchingScript, sendMessageToVariableAccessScript } from "./services/variableScriptCommunicator";
import isEmpty = require("lodash/isEmpty");


console.log("inside activity controls page content script!!!");
let activeUserInPopup : string = "";
startContentScript();

function startContentScript() {
  extensionMessageListener();
}

function extensionMessageListener() {
  chrome.runtime.onMessage.addListener(handleMessageFromBackgroundScript);
}

async function handleMessageFromBackgroundScript(messages: IExtensionEventMessage[], sender: any) {
  console.log("inside handle messages from the backgroud script : ", messages, sender);
  if (!sender.tab) {
    console.log("Message received from background script : ", ...messages, sender);

    messages.forEach(message => {
      const {type : messageType, userId} = message;
      switch (messageType) {

        case APP_CONSTANTS.PROCESSES.RUN_PRE_REFRESH_CHECKS:
          console.log(`Run prerefreshcheck message received from the background - opening myactivity page`);
          activeUserInPopup = convertUserIdToOriginalForm(userId);
          runPreRefreshCycleChecks(activeUserInPopup);
          break;
      }
    });
  }
}

function runPreRefreshCycleChecks(activeUserInPopup) {
  location.hash = appStrings.extensionUrlHash;
  console.log("inside run pre refresh cycle checks...");
  const urlPathname: string = location.pathname;

  if (urlPathname.includes("intro")) {
    console.log(`user is not logged in`);
    // save session token in local storage

    sendMessageToBackgroundScript({
      type: APP_CONSTANTS.PROCESSES.HIGHLIGHT_TAB
    }, ExtensionModule.ContentScript);

    setTimeout(() => {
      sendMessageToBackgroundScript({
        type : APP_CONSTANTS.PROCESSES.SHOW_DESKTOP_NOTIFICATION,
        data : {
          message : `User is Logged out. In order for the Youtube history chrome extension to work properly, user needs to logged in to their google account. Please log into your google account.`,
          title : `Alert`
        }
      }, ExtensionModule.ContentScript);
    }, 1000);
    return;
  } 
  
  extractAndSaveOtherUsers();
  if (activeUserInPopup) {
    extractUserId();
  } else {
    checkIfHistorySettingsAreEnabled();
  }
}

function extractAndSaveOtherUsers() {
  const userLoginDivElems : NodeListOf<HTMLDivElement> = document.querySelectorAll(`a .gb_Fb`);
  const userLoginDivElemsArr : Array<HTMLDivElement> = Array.from(userLoginDivElems);

  let otherUserIds : Array<string> = userLoginDivElemsArr.map(userLoginDivElem => (userLoginDivElem.textContent || "").trim());
  otherUserIds = otherUserIds.map(userId => (userId.includes("default") ? userId.replace(" (default)", "") : userId));
  
  if (!isEmpty(otherUserIds)) {
    console.log(`Extracted other users:  `, otherUserIds);
    const message : any = {
      type : APP_CONSTANTS.DATA_EXCHANGE_TYPE.OTHER_USERS,
      data : {
        users : otherUserIds
      }
    }
    sendMessageToBackgroundScript(message, ExtensionModule.ContentScript);
  }
}

function getYoutubeWatchHistorySetting(): boolean {
  const youtubeWatchHistoryElementParent: Element = document.querySelector('div[data-aid^="youtubeWatch"]');
  const youtubeWatchHistoryElement: any = youtubeWatchHistoryElementParent.firstChild;
  const youtubeHistoryControlStatus: boolean = youtubeWatchHistoryElement.getAttribute("aria-checked") === "true";

  return youtubeHistoryControlStatus;
}

function listenToHistorySettingChanges(): void {
  document.body.addEventListener(
    'click',
    delegate('[aria-label="Turn on"]', function (event) {
      console.log("clicked on turn on button");
      setTimeout(() => {
        const youtubeWatchHistoryEnabled = getYoutubeWatchHistorySetting();
        if (youtubeWatchHistoryEnabled) {
          initiateRefreshCycle();
        }
      }, 3000);
    })
  )
}

function checkIfHistorySettingsAreEnabled(activeUserInPopup ?: string) {
  console.log(`user is logged in`);
  const youtubeWatchHistoryEnabled: boolean = getYoutubeWatchHistorySetting();

  if (youtubeWatchHistoryEnabled) {
    console.log(`Youtube watch history is enabled...`);
    initiateRefreshCycle(activeUserInPopup);
  } else {
    console.log(`Youtube watch history is not enabled`);
    sendMessageToBackgroundScript({
      type: APP_CONSTANTS.PROCESSES.HIGHLIGHT_TAB
    }, ExtensionModule.ContentScript);
    
    sendMessageToBackgroundScript({
      type : APP_CONSTANTS.PROCESSES.SHOW_DESKTOP_NOTIFICATION,
      data : {
        message : "Kindly enable youtube watch history. Without which youtube watch history extension cannot work properly",
        title : ``
      }
    }, ExtensionModule.ContentScript);
    listenToHistorySettingChanges();
  }
}

function initiateRefreshCycle(activeUserInPopup = "") {
  let shaConvertedActiveUserId : string = "";
  if (activeUserInPopup) {
    shaConvertedActiveUserId = btoa((activeUserInPopup));
  }

  // Hide any alert messages 
  console.log("### -> Initiating refresh cycle");
  console.log(`Activity controller content script : redirecting to myactivity page. Initiated by the background script...`);
  location.href = `https://myactivity.google.com/item?restrict=ytw&hl=en-GB#${appStrings.extensionUrlHash}/${shaConvertedActiveUserId}`;
}

async function extractUserId() {
  console.log("inside extract user Id");
  await loadExternalDataFetchingScript('/js/variableAccessScriptNew.js', (variableAccessSriptMessageHandler));
  console.log("inside start data extraction process...post wait for external script load and also some other work");
  const activeUrl : string = window.location.href;
  const activePage : ActivePage = getActivePage(activeUrl);
  
  sendMessageToVariableAccessScript({
    type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_USER_ID,
    activePage
  }, ExtensionModule.ContentScript);
}

function variableAccessSriptMessageHandler(message) {
  const {type, sender} = message;
  console.log("Message received from variable access script : ", message);

  if (sender === ExtensionModule.VariableAccessScript) {
    if (type === APP_CONSTANTS.DATA_EXCHANGE_TYPE.USER_ID) {
      console.log("User Id received from variable access script. Sending it to background script", message.userId);
      let { userId : loggedInUser = ""} = message;
      compareUsers(loggedInUser)
    }
  } 
}

function compareUsers(loggedInUser : string) {
  if (!loggedInUser) {
    throw new Error("Unable to find the logged in user details");
  }

  if (loggedInUser !== activeUserInPopup) {
    console.log(`Logged in User and Active User in differ. Logged In User : ${loggedInUser}, User Active in Popup : ${activeUserInPopup}`);
    // login into the desired account
    logInToActiveUserAccount(activeUserInPopup);  
  } else {
    checkIfHistorySettingsAreEnabled(activeUserInPopup);
  }
}

function logInToActiveUserAccount(activeUserInPopup : string) {
  // TODO : move the selector in the constants file
  let userLoginDivs : any = document.querySelectorAll(`a .gb_Fb`);
  userLoginDivs = Array.from(userLoginDivs);
  let activeUserLoginDiv : HTMLDivElement = userLoginDivs.filter(userLoginDiv => {
    return userLoginDiv.textContent.includes(activeUserInPopup);
  });

  activeUserLoginDiv = activeUserLoginDiv[0];
  if (isEmpty(activeUserLoginDiv)) {
    throw new Error("Unable to find the active user login div");
  }
  console.log("Active user login div : ", activeUserLoginDiv);

  let activeUserLoginDivParent : HTMLAnchorElement = activeUserLoginDiv.closest("a");
  let isActiveUserNotLoggedIn : Boolean = (activeUserLoginDivParent.children.length > 2) || Boolean(activeUserLoginDivParent.querySelector(".gb_xb"));
  
  if (!isActiveUserNotLoggedIn) {
    activeUserLoginDivParent.click();  
  } else {
    sendMessageToBackgroundScript({
      type: APP_CONSTANTS.PROCESSES.HIGHLIGHT_TAB
    }, ExtensionModule.ContentScript);
    setTimeout(() => {
      sendMessageToBackgroundScript({
        type : APP_CONSTANTS.PROCESSES.SHOW_DESKTOP_NOTIFICATION,
        data : {
          message : `The user for which we need to extract the data ( or run refresh cycle) is not logged in. Kindly log in with user ${activeUserInPopup}`,
          title : `Youtube Stats Chrome Extension`
        }
      }, ExtensionModule.ContentScript);
      setTimeout(() => {
        activeUserLoginDivParent.click();         
      }, 2000);
    }, 1000);
  }
}
