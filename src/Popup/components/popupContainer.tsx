import * as React from 'react';
import PopUpHeader from './PopupRefresh';
import { storeAsync as store } from 'chrome-utils';
import { convertUserIdToOriginalForm, sendMessageToBackgroundScript } from 'common/utils';
import { IExtensionEventMessage, ExtensionModule } from 'models';
import { APP_CONSTANTS } from 'appConstants';
import { appConfig } from "config";
import RefreshInterval from './refreshIntervals';
import HistoryStats from './historyStats';

export interface Props {

}

export interface State {
  noUsers: boolean,
  users?: Array<any>,
  lastRunDate?: string,
  selectedUser: string,
  activeRefreshInterval: number,
}

class PopupContainer extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    console.log("Inside Popup container constructor");
    this.state = {
      noUsers: true,
      selectedUser: "",
      activeRefreshInterval: appConfig.defaultRefreshInterval,
    };
  }

  componentDidMount() {
    this.fetchInitialDataForLastActiveUser();
    this.checkForHistoryDataUpdates();
  }

  async checkForHistoryDataUpdates() {
    chrome.runtime.onMessage.addListener((message: IExtensionEventMessage) => {
      if (message.sender === ExtensionModule.Background) {
        console.log("Message received from background script : ", message);

        const messageType = message.type;
        const userId: string = message.userId;

        switch (messageType) {
          case APP_CONSTANTS.DATA_EXCHANGE_TYPE.HISTORY_DATA_UPDATED:
            // console.log("Youtube history data updated...");
            // this.setState((prevState) => {
            //   const { selectedUser } = prevState;
            //   if (selectedUser === userId) {
            //     console.log(`history has been updated for the currently shown user...update the corresponding component...`);
            //     this.getHistoryDataForUser(selectedUser).then(historyData => {
            //       const { lastRunDate } = historyData;
            //       console.log("inside refreshHistoryStats : ", lastRunDate, selectedUser);
            //       this.setState({
            //         ...this.state,
            //         lastRunDate,
            //         selectedUser: selectedUser
            //       });
            //     });

            //   }
            //   return {};
            // });
            break;
        }
      }
    });
  }

  async fetchInitialDataForLastActiveUser() {
    // console.log("inside refresh history stats");
    const lastActiveUserId = await store.get(`lastActiveUser`) || "";

    if (lastActiveUserId) {
      const { lastRunDate } = await this.getHistoryDataForUser(lastActiveUserId);
      let users: Array<any> = await store.get(`users`);
      let activeRefreshInterval: number = await store.get(`activeRefreshInterval`) || appConfig.defaultRefreshInterval;
      // console.log(`fetchInitialDataForLastActiveUser : `, users, lastRunDate);

      users = users.map(userId => {
        return {
          userId,
          userName: convertUserIdToOriginalForm(userId)
        }
      });

      this.setState({
        noUsers: false,
        selectedUser: lastActiveUserId,
        users,
        lastRunDate,
        activeRefreshInterval
      });
    } else {
      console.log(`No active users found...`);
      this.setState({
        ...this.state,
        noUsers: true
      });
    }
  }

  refresHistoryStats = async (selectedUser : string) => {
    console.log(`RefreshHistoryStats : `);
    console.log(`Sending message to background script to initiate history stats for user`, selectedUser);

    // @priority : medium
    // TODO : after refreshing is complete - show the details of the user for which the refreshing has taken place and hide the alert box

    sendMessageToBackgroundScript({
      type: APP_CONSTANTS.PROCESSES.MANUAL_RUN_REFRESH_CYCLE,
      userId : selectedUser
    }, ExtensionModule.Popup);
  }

  updateRefreshInterval = async (newRefreshIntervalValue) => {
    console.log(`Inside updating refresh interval : `, newRefreshIntervalValue);
    sendMessageToBackgroundScript({
      type: APP_CONSTANTS.PROCESSES.UPDATE_REFRESH_INTERVAL,
      data: {
        newRefreshInterval: newRefreshIntervalValue
      }
    }, ExtensionModule.Popup, (response) => {
      console.log(`Post refresh interval updated!!!`, response);
      this.setState({
        activeRefreshInterval: newRefreshIntervalValue
      });
    });
  }

  // util
  getFormattedLastRunTime(lastRunTime: string) {
    const lastRunDate: Date = new Date(lastRunTime);
    const formattedDate : string = lastRunDate.toLocaleDateString("en-us", {
      hour12 : true,
      hour : "numeric",
      minute : "numeric",
      weekday : "short",
      day : "numeric",
      month : "short"
    });
    // let formattedTime: string = lastRunDate.toTimeString();
    // let formattedDate: string = lastRunDate.toDateString();
    // formattedTime = formattedTime.split(" ")[0];
    return formattedDate;
  }

  async getHistoryDataForUser(userId): Promise<any> {
    const lastRunTime: string = await store.get(`lastRun.${userId}`);
    const lastRunDate: string = this.getFormattedLastRunTime(lastRunTime);

    return {
      lastRunDate
    };
  }

  showDetailsForNewUser = (newUserId) => {
    console.log("Showing details for the new selected user : ", newUserId);
    this.setState({
      selectedUser: newUserId
    });
  }

  render() {
    const { noUsers, selectedUser, users, lastRunDate = "", activeRefreshInterval } = this.state;
    console.log(`PopupContainer rendering...`);
    return (
      <section>

        {
          noUsers
            ? "No Data available"
            : (
              <section>
                <PopUpHeader
                  users={users}
                  onUserChange={this.showDetailsForNewUser}
                  lastRunDate={lastRunDate}
                  selectedUserId={selectedUser}
                  onRefreshClick={this.refresHistoryStats.bind(this, selectedUser)}
                />
                <br />
                <RefreshInterval
                  activeRefreshInterval={activeRefreshInterval}
                  onRefreshIntervalChange={this.updateRefreshInterval}
                />
                <br />
                <HistoryStats 
                  selectedUserId={selectedUser}
                />
              </section>
            )
        }
      </section>
    );
  }
}

export default PopupContainer;