import * as React from 'react';
import PopUpHeader from './PopupRefresh';
import { storeAsync as store } from 'chrome-utils';
import { convertUserIdToOriginalForm, sendMessageToBackgroundScript } from 'common/utils';
import { IHistoryStats, IExtensionEventMessage, IYoutubeDayStats, IYoutubeWeekStats } from 'models';
import { APP_CONSTANTS } from 'appConstants';
import { appConfig, StatsIntervalOptions } from "config";
import RefreshInterval from './refreshIntervals';
import HistoryStats from './historyStats';

export interface Props {

}

export interface State {
  noUsers: boolean,
  // historyStats?: IHistoryStats,
  users?: Array<any>,
  lastRunDate?: string,
  selectedUser: string,
  activeRefreshInterval: number,
  historyStats?: any
}

class PopupContainer extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    console.log("Inside Popup container constructor");
    this.state = {
      noUsers: true,
      selectedUser: "",
      activeRefreshInterval: appConfig.defaultRefreshInterval
    };
  }

  componentDidMount() {
    this.fetchInitialHistoryDataForLastActiveUser();
    this.checkForHistoryDataUpdates();
  }

  async checkForHistoryDataUpdates() {
    chrome.runtime.onMessage.addListener((message: IExtensionEventMessage) => {
      if (message.sender === APP_CONSTANTS.SENDER.BACKGROUND) {
        console.log("Message received from background script : ", message);

        const messageType = message.type;
        const userId: string = message.userId;

        switch (messageType) {
          case APP_CONSTANTS.DATA_EXCHANGE_TYPE.HISTORY_DATA_UPDATED:
            console.log("Youtube history data updated...");
            this.setState((prevState) => {
              const { selectedUser } = prevState;
              if (selectedUser === userId) {
                console.log(`history has been updated for the currently shown user...update the corresponding component...`);
                this.getHistoryDataForUser(selectedUser).then(historyData => {
                  const { historyStats, lastRunDate } = historyData;
                  console.log("inside refreshHistoryStats : ", historyStats, lastRunDate, selectedUser);
                  this.setState({
                    ...this.state,
                    // historyStats,
                    lastRunDate,
                    selectedUser: selectedUser
                  });
                });

              }
              return {};
            });
            break;
        }
      }
    });
  }

  async fetchInitialHistoryDataForLastActiveUser() {
    console.log("inside refresh history stats");
    const lastActiveUserId = await store.get(`lastActiveUser`) || "";

    if (lastActiveUserId) {
      const { lastRunDate } = await this.getHistoryDataForUser(lastActiveUserId);
      let users: Array<any> = await store.get(`users`);
      let activeRefreshInterval: number = await store.get(`activeRefreshInterval`) || appConfig.defaultRefreshInterval;
      console.log(`fetchInitialHistoryDataForLastActiveUser : `, users, lastRunDate);

      users = users.map(userId => {
        return {
          userId,
          userName: convertUserIdToOriginalForm(userId)
        }
      });

      this.setState({
        noUsers: false,
        selectedUser: lastActiveUserId,
        // historyStats,
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

  refresHistoryStats = async () => {
    console.log(`RefreshHistoryStats : `);
    console.log(`Sending message to background script to initiate history stats for user`);

    // @priority : low 
    // TODO : to show alert box with the message - Refreshing history for the logged in Google user - xxxxxx. Note : Refreshing always
    // takes place for the currently loggedIn user and not the selectedUser
    // @priority : medium
    // TODO : after refreshing is complete - show the details of the user for which the refreshing has taken place and hide the alert box

    sendMessageToBackgroundScript({
      type: APP_CONSTANTS.PROCESSES.MANUAL_RUN_REFRESH_CYCLE,
    }, null, APP_CONSTANTS.SENDER.POPUP);
  }

  updateRefreshInterval = async (newRefreshIntervalValue) => {
    console.log(`Inside updating refresh interval : `, newRefreshIntervalValue);
    sendMessageToBackgroundScript({
      type: APP_CONSTANTS.PROCESSES.UPDATE_REFRESH_INTERVAL,
      data: {
        newRefreshInterval: newRefreshIntervalValue
      }
    }, (response) => {
      console.log(`Post refresh interval updated!!!`, response);
      this.setState({
        activeRefreshInterval: newRefreshIntervalValue
      });
    }, APP_CONSTANTS.SENDER.POPUP);
  }

  // util
  getFormattedLastRunTime(lastRunTime: string) {
    const lastRunDate: Date = new Date(lastRunTime);
    let formattedTime: string = lastRunDate.toTimeString();
    let formattedDate: string = lastRunDate.toDateString();
    formattedTime = formattedTime.split(" ")[0];

    return `${formattedTime}, ${formattedDate}`;
  }

  async getHistoryDataForUser(userId): Promise<any> {
    // const historyStats: IHistoryStats = await store.get(`historyStats.${userId}`);
    const lastRunTime: string = await store.get(`lastRun.${userId}`);
    const lastRunDate: string = this.getFormattedLastRunTime(lastRunTime);

    return {
      // historyStats,
      lastRunDate
    };
  }

  showDetailsForNewUser = (newUserId) => {
    console.log("Showing details for the new selected user : ", newUserId);
    this.setState({
      selectedUser: newUserId
    });
  }

  fetchStats(userId, statInterval: StatsIntervalOptions, date: Date) {
    sendMessageToBackgroundScript({
      type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.FETCH_STATS_FOR_INTERVAL,
      data: {
        statInterval,
        date,
        userId,
        loadCount: appConfig.defaultStatsLoadCount
      }
    }, (response) => {
      console.log(`Post stat interval updated!!!`);
    }, APP_CONSTANTS.SENDER.POPUP);
  }

  render() {
    const { noUsers, selectedUser, users, lastRunDate = "", activeRefreshInterval, historyStats } = this.state;

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
                  onRefreshClick={this.refresHistoryStats}
                />
                <br />
                <RefreshInterval
                  activeRefreshInterval={activeRefreshInterval}
                  onRefreshIntervalChange={this.updateRefreshInterval}
                />
                <br />
                <HistoryStats
                  fetchStats={this.fetchStats.bind(this, selectedUser)}
                  historyStats={historyStats}
                />
              </section>
            )
        }
      </section>
    );
  }
}

export default PopupContainer;