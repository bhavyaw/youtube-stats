import { ActivePage, ExtensionModule } from '../interfaces';
import isEmpty = require('lodash/isEmpty');

export function sendMessageToBackgroundScript(
  message: any,
  sender: ExtensionModule,
  responseCallback?: Function
) {
  const activeUrl: string = window.location.href;
  const activePage: ActivePage = getActivePage(activeUrl);

  const messageToSend: any = {
    ...message,
    activePage,
    sender
  };

  console.log(`Sending Message to background script : `, messageToSend);
  chrome.runtime.sendMessage(messageToSend, responseCallback);
}

export function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function convertUserIdToSavableForm(userId: string): string {
  userId = userId.replace(/\./g, '_'); // replacing underscores with
  return userId;
}

export function convertUserIdToOriginalForm(userId = ''): string {
  if (isEmpty(userId)) {
    return userId;
  }

  if (!userId.includes('.com')) {
    userId = userId + '.com';
  }
  userId = userId.replace(/_/g, '.');
  return userId;
}

export function createContinuationDataFetchingUrl(nextContinuationDataFetchingParam: string) {
  const continuation = nextContinuationDataFetchingParam.replace(/%3D/g, '%253D');
  const continuationDataFetchingUrl = `https://www.youtube.com/browse_ajax?ctoken=${continuation}&continuation=${continuation}&itct=${nextContinuationDataFetchingParam}`;
  return continuationDataFetchingUrl;
}

export function timeDifferenceGreaterThan(
  currentTime: number,
  pastTime: number,
  duration: number,
  hrsMinsSecs: string
): boolean {
  if (!pastTime) {
    return true;
  }

  currentTime = currentTime || Date.now();

  const timeDifference = currentTime - pastTime;
  let isTimeDifferenceGreater: boolean = false;

  switch (hrsMinsSecs) {
    case 'mm':
      const minsInMs = duration * 60 * 60;
      isTimeDifferenceGreater = timeDifference > minsInMs;
      break;
  }

  return isTimeDifferenceGreater;
}

export function getActivePage(url: string): ActivePage {
  const urlObj: URL = new URL(url);
  const hostname: string = urlObj.hostname;
  const pathName: string = urlObj.pathname || '';
  const searchParams: string = urlObj.search || '';
  const completeUrl: string = `${hostname}${pathName}${searchParams}`;
  const activityControlsPageUrlRegex = /myaccount\.google\.com\/(u\/\d\/|intro\/)?activitycontrols(\?pageId=none)?$/i;
  const myActivityPageRegex = /myactivity.google.com\/item/i;
  let activePage = ActivePage.other;

  // https://www.youtube.com/watch?v=CkTw2-9d1rc

  if (activityControlsPageUrlRegex.test(completeUrl)) {
    activePage = ActivePage.activityControls;
  } else if (myActivityPageRegex.test(completeUrl)) {
    activePage = ActivePage.myActivity;
  } else if (/(www\.)?youtube.com\/feed\/history/i.test(completeUrl)) {
    activePage = ActivePage.history;
  } else if (/(www\.)?youtube.com\/watch\?v=/i.test(completeUrl)) {
    activePage = ActivePage.video;
  } else if (/(www\.)?youtube.com\//i.test(completeUrl)) {
    activePage = ActivePage.home;
  }

  return activePage;
}

export function logError(message: string, errorDetails: any, throwError?: boolean) {
  console.log('Reporting Error to admin', message, errorDetails);

  if (throwError) {
    throw errorDetails;
  }
}

export function convertEnumToArray(
  enumType
): Array<{
  name: string;
  value: string;
}> {
  const arr: Array<{
    name: string;
    value: string;
  }> = [];

  Object.keys(enumType).forEach(name => {
    const value = enumType[name];
    if (!isNaN(Number(value))) {
      arr.push({
        name,
        value
      });
    }
  });

  return arr;
}

/**
 *
 * @param timeInSecs
 * @param formatLevel {number} - from 1-4, 1-days, 4-ms
 */
export function convertDurationToProperFormat(timeInSecs: number, formatLevel = 3) {
  let formattedDuration: string;

  if (timeInSecs > 0) {
    const days = timeInSecs / (60 * 60 * 24);
    const absoluteDays = Math.floor(days);

    const hours = (days - absoluteDays) * 24;
    const absoluteHours = Math.floor(hours);

    // Get remainder from hours and convert to minutes
    const minutes = (hours - absoluteHours) * 60;
    const absoluteMinutes = Math.floor(minutes);

    const seconds = (minutes - absoluteMinutes) * 60;
    const absoluteSeconds = Math.floor(seconds);

    formattedDuration = `${absoluteDays ? absoluteDays + 'd ' : ''}${
      absoluteHours ? absoluteHours + 'h ' : ''
    }${absoluteMinutes ? absoluteMinutes + 'm ' : ''}${absoluteSeconds + 's'}`;
  } else {
    formattedDuration = `-`;
  }

  formattedDuration = formattedDuration
    .split(' ')
    .slice(0, formatLevel)
    .join(' ');

  return formattedDuration;
}

export function showDesktopNotification(
  message: string,
  title = '',
  type = 'basic',
  iconUrl = '../icon48.png'
) {
  chrome.notifications.create({
    message,
    type,
    title,
    iconUrl
  });
}

export function formatDate(watchedOnDate: Date, dateFormat: string): string {
  let formattedDate: string = '';

  switch (dateFormat) {
    case 'dd-mm-yyyy':
      formattedDate = `${watchedOnDate.getDate()}-${watchedOnDate.getMonth() +
        1}-${watchedOnDate.getFullYear()}`;
      break;

    case "DDD, dd mmm'yy":
      const dateString: string = watchedOnDate.toDateString();
      const splitDateString: string[] = dateString.split(' ');
      const day: string = splitDateString[0];
      const month: string = splitDateString[1];
      const date: string = splitDateString[2];
      let year: string = splitDateString.pop();
      year = year.slice(2);

      formattedDate = `${day}, ${date} ${month}'${year}`;
      break;
  }

  return formattedDate;
}

export function isValidDate(d) {
  const isDateInstance = d instanceof Date;
  return isDateInstance && !isNaN(d);
}
