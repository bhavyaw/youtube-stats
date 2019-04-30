import * as React from 'react';
import PopUpHeader from '../PopupRefresh';
import { convertUserIdToOriginalForm, sendMessageToBackgroundScript } from 'common/utils';
import { ExtensionModule } from 'interfaces';
import { APP_CONSTANTS } from 'appConstants';
import { appConfig } from 'config';
import RefreshInterval from '../refreshIntervals';
import HistoryStatsContainer from '../historyStatsContainer';
import User from 'models/UserModel';
import keys = require('lodash/keys');
import App from 'models/AppModel';

import './Popup.scss';
import * as Styles from './PopupContainer.module.scss';
console.log('PopupContainer styles : ', Styles);

export interface Props {}

export interface State {
  noUsers: boolean;
  users?: any[];
  lastRunDate?: string;
  selectedUser: string;
  activeRefreshInterval: number;
  activeUserCumulativeStats?: any;
  settingsViewShow: boolean;
}

class PopupContainer extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    console.log('Inside Popup container constructor');
    this.state = {
      noUsers: true,
      selectedUser: '',
      activeRefreshInterval: appConfig.defaultRefreshInterval,
      settingsViewShow: false
    };
  }

  public componentDidMount() {
    this.fetchInitialDataForLastActiveUser();
  }

  public async fetchInitialDataForLastActiveUser() {
    // console.log("inside refresh history stats");
    const app: App = new App();
    const appData: any = await app.get();
    let lastActiveUserId = appData.lastActiveUser || '';
    const allUsers: any[] = await new User().get();
    const allUserIds = keys(allUsers);
    lastActiveUserId = lastActiveUserId ? lastActiveUserId : allUserIds[0];

    if (lastActiveUserId) {
      const lastActiveUser: User = new User(lastActiveUserId);
      const lastActiveUserData: any = await lastActiveUser.get();
      const lastRunTime: string = lastActiveUserData.lastRunTime;
      const lastCumulativeStats: any = lastActiveUserData.stats.cumulative;
      const lastRunDate: string = this.getFormattedLastRunTime(lastRunTime);

      const activeRefreshInterval: number = appData.activeRefreshInterval;
      console.log(
        'fetchInitialDataForLastActiveUser() :',
        lastActiveUserId,
        lastActiveUser,
        lastActiveUserData
      );

      // console.log(`fetchInitialDataForLastActiveUser : `, users, lastRunDate);
      const usersDisplayList = allUserIds.map(userId => {
        return {
          userId,
          userName: convertUserIdToOriginalForm(userId)
        };
      });

      this.setState({
        noUsers: false,
        selectedUser: lastActiveUserId,
        users: usersDisplayList,
        lastRunDate,
        activeRefreshInterval,
        activeUserCumulativeStats: lastCumulativeStats
      });
    } else {
      console.log(`No active users found...`);
      this.setState({
        ...this.state,
        noUsers: true
      });
    }
  }

  public refresHistoryStats = async (selectedUser: string) => {
    console.log(`RefreshHistoryStats : `);
    console.log(
      `Sending message to background script to initiate history stats for user`,
      selectedUser
    );

    // @priority : medium
    // TODO : after refreshing is complete - show the details of the user for which the refreshing has taken place and hide the alert box

    sendMessageToBackgroundScript(
      {
        type: APP_CONSTANTS.PROCESSES.MANUAL_RUN_REFRESH_CYCLE,
        userId: selectedUser
      },
      ExtensionModule.Popup
    );
  };

  public updateRefreshInterval = async newRefreshIntervalValue => {
    console.log(`Inside updating refresh interval : `, newRefreshIntervalValue);
    sendMessageToBackgroundScript(
      {
        type: APP_CONSTANTS.PROCESSES.UPDATE_REFRESH_INTERVAL,
        data: {
          newRefreshInterval: newRefreshIntervalValue
        }
      },
      ExtensionModule.Popup,
      response => {
        console.log(`Post refresh interval updated!!!`, response);
        this.setState({
          activeRefreshInterval: newRefreshIntervalValue
        });
      }
    );
  };

  // util
  public getFormattedLastRunTime(lastRunTime: string) {
    const lastRunDate: Date = new Date(lastRunTime);
    const formattedDate: string = lastRunDate.toLocaleDateString('en-us', {
      hour12: true,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
    // let formattedTime: string = lastRunDate.toTimeString();
    // let formattedDate: string = lastRunDate.toDateString();
    // formattedTime = formattedTime.split(" ")[0];
    return formattedDate;
  }

  public async getHistoryDataForUser(userId): Promise<any> {}

  public showDetailsForNewUser = newUserId => {
    console.log('Showing details for the new selected user : ', newUserId);
    this.setState({
      selectedUser: newUserId
    });
  };

  private handleSettingsRowClick = e => {
    this.setState(prevState => {
      const settingsViewShow: Boolean = prevState.settingsViewShow;

      return {
        settingsViewShow: !settingsViewShow
      };
    });
  };

  public render() {
    const {
      noUsers,
      selectedUser,
      users,
      lastRunDate = '',
      activeRefreshInterval,
      activeUserCumulativeStats = {},
      settingsViewShow
    } = this.state;
    console.log(`PopupContainer rendering...`);
    return (
      <section className={`${Styles.popUpWrapper} container-fluid`}>
        {noUsers ? (
          'No Data available'
        ) : (
          <React.Fragment>
            <section className="row mb-1" onClick={this.handleSettingsRowClick}>
              <div className="col-12">Settings</div>
              {settingsViewShow && (
                <RefreshInterval
                  activeRefreshInterval={activeRefreshInterval}
                  onRefreshIntervalChange={this.updateRefreshInterval}
                />
              )}
            </section>
            <PopUpHeader
              users={users}
              onUserChange={this.showDetailsForNewUser}
              lastRunDate={lastRunDate}
              selectedUserId={selectedUser}
              onRefreshClick={this.refresHistoryStats.bind(this, selectedUser)}
              cumulativeStats={activeUserCumulativeStats}
            />

            <HistoryStatsContainer selectedUserId={selectedUser} />
          </React.Fragment>
        )}
      </section>
    );
  }
}

export default PopupContainer;
