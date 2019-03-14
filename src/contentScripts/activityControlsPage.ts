import { IExtensionEventMessage } from "models";
import { APP_CONSTANTS } from "appConstants";
import { sendMessageToBackgroundScript, convertUserIdToSavableForm, convertUserIdToOriginalForm } from "common/utils";
import { delegate } from 'receptor';
import appStrings from "appStrings";
import { loadExternalDataFetchingScript, sendMessageToVariableAccessScript } from "./services/variableScriptCommunicator";


console.log("inside activity controls page content script!!!");
let activeUserIdInPopup :string = "";
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
          activeUserIdInPopup = userId;
          runPreRefreshCycleChecks(activeUserIdInPopup);
          break;
      }
    });
  }
}

function runPreRefreshCycleChecks(activeUserIdInPopup) {
  document.title = appStrings.activityControlsPageNewTitle;
  console.log("inside run pre refresh cycle checks...");
  const urlPathname: string = location.pathname;


  if (urlPathname.includes("intro")) {
    console.log(`user is not logged in`);
    // save session token in local storage

    sendMessageToBackgroundScript({
      type: APP_CONSTANTS.PROCESSES.HIGHLIGHT_TAB
    });
    // TODO : show desktop notification here
    alert("User is Logged out. In order for the Youtube history chrome extension to work properly, user needs to logged in to their google account. Please log into your google account.")
    return;
  } 

  // checking if the desired user is logged in or not
  if (activeUserIdInPopup) {
    extractUserId();
  } else{
    // Checking whether the history settings are enabled or not    
    checkIfHistorySettingsAreEnabled();
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

function initiateRefreshCycle() {
  // Hide any alert messages 
  console.log("### -> Initiating refresh cycle");
  console.log(`Activity controller content script : redirecting to myactivity page. Initiated by the background script...`);
  sendMessageToBackgroundScript({
    type : APP_CONSTANTS.PROCESSES.SHOW_DESKTOP_NOTIFICATION,
    data : {
      message : `Activity Controller content script : Redirecting to myActivity Page - Initiated by background script via runRefreshCycle`,
      title : `Testing Alert`
    }
  }, null, APP_CONSTANTS.SENDER.CONTENT_SCRIPT);
  location.href = "https://myactivity.google.com/item?restrict=ytw&hl=en-GB";
}

async function extractUserId() {
  console.log("inside extract user Id");
  await loadExternalDataFetchingScript('/js/variableAccessScriptNew.js', (variableAccessSriptMessageHandler));
  console.log("inside start data extraction process...post wait for external script load and also some other work");
  sendMessageToVariableAccessScript({
    type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.GET_USER_ID,
  });
}

function variableAccessSriptMessageHandler(message) {
  const type = message.type;
  console.log("Message received from variable access script : ", message);

  if (type === APP_CONSTANTS.DATA_EXCHANGE_TYPE.USER_ID) {
    console.log("User Id received from variable access script. Sending it to background script", message.userId);
    let { loggedInUser } = message;
    loggedInUser = convertUserIdToSavableForm(loggedInUser);
    compareUsers(loggedInUser)
  }
}

function compareUsers(loggedInUser : string) {
  if (!loggedInUser) {
    throw new Error("Unable to find the logged in user details");
  }

  if (loggedInUser !== activeUserIdInPopup) {
    console.log(`Logged in User and Active User in differ. Logged In User : ${loggedInUser}, User Active in Popup : ${activeUserIdInPopup}`);
    // login into the desired account
    logInToActiveUserAccount(activeUserIdInPopup);  
  } else {
    checkIfHistorySettingsAreEnabled();
  }
}

function checkIfHistorySettingsAreEnabled() {
  console.log(`user is logged in`);
  const youtubeWatchHistoryEnabled: boolean = getYoutubeWatchHistorySetting();

  if (youtubeWatchHistoryEnabled) {
    console.log(`Youtube watch history is enabled...`);
    initiateRefreshCycle();
  } else {
    console.log(`Youtube watch history is not enabled`);
    sendMessageToBackgroundScript({
      type: APP_CONSTANTS.PROCESSES.HIGHLIGHT_TAB
    });
    alert("Kindly enable youtube watch history. Without which youtube watch history extension cannot work properly");
    listenToHistorySettingChanges();
  }
}

function logInToActiveUserAccount(activeUserIdInPopup : string) {
  const readableActiveUserIdInPopup : string = convertUserIdToOriginalForm(activeUserIdInPopup);
  let userLoginDivs : any = document.querySelectorAll(`.gb_Fb[dir="ltr"]`);
  userLoginDivs = Array.from(userLoginDivs);
  let activeUserLoginDiv : HTMLDivElement = userLoginDivs.filter(userLoginDiv => {
    return userLoginDiv.textContent.includes(activeUserIdInPopup);
  });

  if (!activeUserLoginDiv) {
    throw new Error("Unable to find the active user login div");
  }

  let activeUserLoginDivParent : HTMLAnchorElement = activeUserLoginDiv.closest("a");
  let isActiveUserLoggedIn : Boolean = (activeUserLoginDivParent.children.length > 2) || Boolean(activeUserLoginDivParent.querySelector(".gb_xb"));
  
  if (isActiveUserLoggedIn) {
    activeUserLoginDivParent.click();  
  } else {
    sendMessageToBackgroundScript({
      type: APP_CONSTANTS.PROCESSES.HIGHLIGHT_TAB
    });
    setTimeout(() => {
      sendMessageToBackgroundScript({
        type : APP_CONSTANTS.PROCESSES.SHOW_DESKTOP_NOTIFICATION,
        data : {
          message : `The user for which we need to extract the data ( or run refresh cycle) is not logged in. Kindly log in with user ${readableActiveUserIdInPopup}`,
          title : `Youtube Stats Chrome Extension`
        }
      }, null, APP_CONSTANTS.SENDER.CONTENT_SCRIPT);
      setTimeout(() => {
        activeUserLoginDivParent.click();         
      }, 2000);
    }, 1000);
  }
}
