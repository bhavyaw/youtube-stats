import { getActivePage } from 'common/utils';
import { ActivePage, IRoutingType, IRoute  } from 'interfaces';


class TabHistory {
  history : Map<number, Array<ActivePage>> = new Map();

  constructor() {}

  public update(activeTab : chrome.tabs.Tab) {
    const activePage : ActivePage = getActivePage(activeTab.url);
    const {id} = activeTab;

    const tabExistingHistory : Array<ActivePage> = this.history.get(id);

    if (tabExistingHistory) {
      tabExistingHistory.push(activePage);
    } else {
      const newTabHistory : Array<ActivePage> = [activePage];
      this.history.set(id, newTabHistory);
    }
  }

  public remove(closedTabId : number) {
    this.history.delete(closedTabId);
  }
  

  private get(tabId) : Array<ActivePage>{
    const tabExistingHistory : Array<ActivePage> = this.history.get(tabId);
    return tabExistingHistory;
  }

  public getPageRouteDetails(tabId) {
    let routeType : IRoutingType = IRoutingType.NOT_YOUTUBE_PAGE;
    let currentActivePage : ActivePage , previousActivePage : ActivePage;
    const tabExistingHistory : Array<ActivePage> = this.history.get(tabId);
    
    if (tabExistingHistory) {
      currentActivePage = tabExistingHistory.pop();
      previousActivePage = tabExistingHistory.pop();

      if (currentActivePage !== ActivePage.other) {
        if (/undefined|other/.test(previousActivePage)) {
          routeType = IRoutingType.FROM_OUTSIDE_YOUTUBE;
        } else {
          routeType = IRoutingType.FROM_WITHIN_YOUTUBE;
        }
      }
    } 

    const routeDetails : IRoute = {
      routeType,
      currentActivePage,
      previousActivePage 
    };

    return routeDetails;
  }
}

const tabHistory = new TabHistory();
export default tabHistory;