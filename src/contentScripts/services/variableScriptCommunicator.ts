import { IExtensionEventMessage } from "models";

const variableScriptListeners = [];

 export async function loadExternalDataFetchingScript(
    variableAccessScriptPath : string,
    variableScriptMessageHandler : Function, 
    windowNode ?: Window, 
    headNode ?: HTMLHeadElement)
 {
    windowNode = windowNode || window;
    headNode = headNode || document.getElementsByTagName("head")[0];
    const windowVariablesFetchingFile = chrome.extension.getURL(variableAccessScriptPath);

    await injectVariableAccessScript(windowVariablesFetchingFile, headNode);
    if (!variableScriptListeners.length) {
        windowNode.addEventListener('message', (e) => handleEventListener(windowNode, e));
    }
    variableScriptListeners.push(variableScriptMessageHandler);
  }

function handleEventListener(windowNode : Window, e : any) : void{
    // We only accept messages from ourselves
    if (windowNode && windowNode != e.source ) {
        return;                    
    }

    const data = e.data;
    variableScriptListeners.forEach(variableScriptListener => variableScriptListener(data));
} 

async function injectVariableAccessScript(filePath, headNode : HTMLElement) : Promise<any> {
    const existingScriptElem : Element = document.getElementById("ce-variable-access-script");

    return new Promise((resolve) => {
        if (!existingScriptElem) {
            let scriptElem = document.createElement('script');
            // const chromeRuntimeId = chrome.runtime.id;
            scriptElem.setAttribute('type', 'text/javascript');
            scriptElem.setAttribute('src', filePath);
            scriptElem.setAttribute("id","ce-variable-access-script");
            // scriptElem.setAttribute("extensionId", chromeRuntimeId);
            headNode.appendChild(scriptElem);
            scriptElem.onload = (e) => {
                resolve();
            };
        } else {
            resolve();
        } 
    }); 
}

export function sendMessageToVariableAccessScript(message : IExtensionEventMessage, targetUrl : string, windowNode ?: Window) {
    windowNode = windowNode || window;
    windowNode.postMessage(message, targetUrl);
}