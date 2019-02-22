import * as React from 'react';
import UserDetails from './userDetails';

interface AppProps {
    users: any[],
    onRefreshClick(event: any),
    selectedUserId: string,
    lastRunDate: string,
    onUserChange(newUserId: string)
}

interface AppState { }

export default class PopupRefresh extends React.Component<AppProps, AppState> {
    constructor(props: AppProps, state: AppState) {
        super(props, state);
    }

    componentDidMount() {
        // Example of how to send a message to eventPage.ts.
        chrome.runtime.sendMessage({ popupMounted: true });
    }

    handleRefreshClick: React.ReactEventHandler = (e) => {
        console.log("Refreshing history stats");
        this.props.onRefreshClick(this.props.selectedUserId);
    }

    render() {
        const { lastRunDate, selectedUserId, onUserChange, users } = this.props;

        return (
            <section>
                <UserDetails
                    selectedUserId={selectedUserId}
                    users={users}
                    onUserChange={onUserChange}
                />
                <section>
                    Last Run : {lastRunDate}
                </section>
                <button
                    onClick={this.handleRefreshClick}
                >Refresh</button>
            </section>
        )
    }
}

