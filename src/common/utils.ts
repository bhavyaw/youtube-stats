import { ActivePage } from '../models';

export function sendMessageToBackgroundScript(message: any, responseCallback?: Function, sender?: string) {
  const activeUrl: string = window.location.href;
  const activePage: ActivePage = getActivePage(activeUrl);

  message = {
    ...message,
    activePage
  };

  if (!message.sender && sender) {
    message['sender'] = sender;
  }
  chrome.runtime.sendMessage(message, responseCallback);
}

export function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function convertUserIdToSavableForm(userId: string): string {
  userId = userId.replace(".com", "");
  userId = userId.replace(/\./g, "_"); // replacing underscores with 
  return userId;
}

export function convertUserIdToOriginalForm(userId: string): string {
  userId = userId + ".com";
  userId = userId.replace(/_/g, ".");
  return userId;
}

export function createContinuationDataFetchingUrl(nextContinuationDataFetchingParam: string) {
  const continuation = nextContinuationDataFetchingParam.replace(/%3D/g, "%253D");
  const continuationDataFetchingUrl = `https://www.youtube.com/browse_ajax?ctoken=${continuation}&continuation=${continuation}&itct=${nextContinuationDataFetchingParam}`;
  return continuationDataFetchingUrl;
}


export function timeDifferenceGreaterThan(currentTime: number, pastTime: number, duration: number, hrsMinsSecs: string): boolean {
  if (!pastTime) {
    return true;
  }

  currentTime = currentTime || Date.now();

  const timeDifference = currentTime - pastTime;
  let isTimeDifferenceGreater: boolean = false;

  switch (hrsMinsSecs) {
    case "mm":
      const minsInMs = duration * 60 * 60;
      isTimeDifferenceGreater = timeDifference > minsInMs;
      break;
  }

  return isTimeDifferenceGreater;
}

export function getActivePage(url: string): ActivePage {
  const urlObj: URL = new URL(url);
  const pathName: string = urlObj.pathname;

  if (pathName === "/") {
    return ActivePage.home;
  } else if (pathName === "/feed/history") {
    return ActivePage.history;
  } else if (pathName === "/watch") {
    return ActivePage.video;
  } else {
    return ActivePage.other;
  }
}

export function logError(message: string, errorDetails: any, throwError?: boolean) {
  console.log("Reporting Error to admin", message, errorDetails);

  if (throwError) {
    throw errorDetails;
  }
}

