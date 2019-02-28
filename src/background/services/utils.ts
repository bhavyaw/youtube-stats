import { APP_CONSTANTS } from './../../appConstants';
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

    case "DDD, dd mmm'yy" : 
      const dateString : string = watchedOnDate.toDateString();
      const splitDateString : Array<string> = dateString.split(" ");
      const day : string = splitDateString[0];
      const month : string = splitDateString[1];
      const date : string = splitDateString[2];
      let year : string = splitDateString.pop();
      year = year.slice(2);

      formattedDate = `${day}, ${date} ${month}'${year}`;
      break;
    }

  return formattedDate;
}