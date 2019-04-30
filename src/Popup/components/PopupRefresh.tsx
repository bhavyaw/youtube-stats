import * as React from 'react';
import UserDetails from './userDetails';
import { convertDurationToProperFormat } from 'common/utils';

interface AppProps {
  users: any[];
  onRefreshClick(event: any);
  selectedUserId: string;
  lastRunDate: string;
  cumulativeStats: any;
  onUserChange(newUserId: string);
}

interface AppState {}

export default class PopupRefresh extends React.Component<AppProps, AppState> {
  constructor(props: AppProps, state: AppState) {
    super(props, state);
  }

  public componentDidMount() {
    // Example of how to send a message to eventPage.ts.
    chrome.runtime.sendMessage({ popupMounted: true });
  }

  public handleRefreshClick: React.ReactEventHandler = e => {
    console.log('Refreshing history stats');
    this.props.onRefreshClick(this.props.selectedUserId);
  };

  public render() {
    const { lastRunDate, selectedUserId, onUserChange, users, cumulativeStats } = this.props;

    console.log(`PopupHeader rendering...`, cumulativeStats);

    return (
      <React.Fragment>
        <section className="row my-1">
          <UserDetails selectedUserId={selectedUserId} users={users} onUserChange={onUserChange} />
          <div className="col-6">Last Run : {lastRunDate}</div>
          <div className="col-6">
            <button onClick={this.handleRefreshClick}>Refresh</button>
          </div>
        </section>
        {cumulativeStats && (
          <section className="my-1">
            <table>
              <tbody>
                <tr>
                  <td> Total Watched Videos : {cumulativeStats.totalCount}</td>
                  <td>
                    Total Watched Duration :
                    {convertDurationToProperFormat(cumulativeStats.totalWatchedDuration)}
                  </td>
                  <td> Total Active days : {cumulativeStats.totalActiveDays}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}
      </React.Fragment>
    );
  }
}
