import { IExtensionEventMessage } from "models";

function sendMessageToPopUpPage(message: IExtensionEventMessage) {
  console.log("sending message to popup page...", message);
  chrome.runtime.sendMessage({
    ...message,
  });
}

export const storeSimpleApi = {
  set: chrome.storage.local.set,
  get: chrome.storage.local.get,
  clearAll: chrome.storage.local.clear,
  usage: chrome.storage.local.getBytesInUse
}

export function formatDate(watchedOnDate: Date, dateFormat: string): string {
  let formattedDate: string = "";

  switch (dateFormat) {
    case "dd-mm-yyyy":
      formattedDate = `${watchedOnDate.getDate()}-${watchedOnDate.getMonth() + 1}-${watchedOnDate.getFullYear()}`;
      break;
  }

  return formattedDate;
}