import { IExtensionEventMessage } from "models";
import { APP_CONSTANTS } from 'appConstants';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import PopupContainer from "./components/popupContainer";

import "./Popup.scss";

startPopUpScript();

function startPopUpScript() {
  initialize();
  chrome.runtime.onMessage.addListener(handleMessageFromBackgroundScript);
}

function initialize() {
  renderPopupComponent();
}

function renderPopupComponent() {
  // Get the DOM Element that will host our React application
  const rootEl = document.getElementById("pop-up-container");
  // Render the React application to the DOM
  ReactDOM.render(<PopupContainer />, rootEl);
}

function handleMessageFromBackgroundScript(message: IExtensionEventMessage, sender: any, responseCallback: Function) {
  console.log("inside handle messages from the backgroud script : ", message, sender);
  if (!sender.tab) {
    console.log("Message received from background script : ", message);

    const messageType = message.type;
    switch (messageType) {

      case APP_CONSTANTS.PROCESSES.HIGHLIGHT_TAB:
        console.log("from inside the popup script...handling user logged out...");
        break;
    }
  }
}

function sendMessageToBackgroundScript(message: IExtensionEventMessage) {
  chrome.runtime.sendMessage({
    ...message,
    sender: APP_CONSTANTS.RECEIVER.POPUP
  })
}

console.log(sendMessageToBackgroundScript);