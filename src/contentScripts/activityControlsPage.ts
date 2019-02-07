import { IExtensionEventMessage } from "models";
import { APP_CONSTANTS } from "appConstants";
import { sendMessageToBackgroundScript } from "common/utils";
import { delegate } from 'receptor';

console.log("inside activity controls page content script!!!");

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
    console.log("Message received from background script : ", ...messages);

    messages.forEach(message => {
      const messageType = message.type;
      switch (messageType) {

        case APP_CONSTANTS.PROCESSES.RUN_PRE_REFRESH_CHECKS:
          runPreRefreshCycleChecks();
          break;
      }
    });
  }
}

function runPreRefreshCycleChecks() {
  document.title = "Activity controls - Opened by Youtube History Chrome Extension"
  console.log("inside run pre refresh cycle checks...");
  const urlPathname: string = location.pathname;


  if (urlPathname.includes("intro")) {
    console.log(`user is not logged in`);
    // save session token in local storage

    sendMessageToBackgroundScript({
      type: APP_CONSTANTS.PROCESSES.HIGHLIGHT_TAB
    });
    alert("User is Logged out. In order for the Youtube history chrome extension to work properly, user needs to logged in to their google account. Please log into your google account.")
  } else {
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
  location.href = "https://myactivity.google.com/item?restrict=ytw&hl=en-GB";
}


