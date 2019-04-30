import * as React from 'react';
import StatsTabularView from './tabularStats';
import StatsGraphicalView from './graphicalStats';
import {
  StatsIntervalOptions,
  StatsDisplayTypes,
  StatsDataFetchingCases,
  ExtensionModule
} from 'interfaces';
import { convertEnumToArray, sendMessageToBackgroundScript } from 'common/utils';
import DatePicker from 'react-datepicker';
import { IYoutubeDayStats } from 'interfaces';

import 'react-datepicker/dist/react-datepicker.css';
import { APP_CONSTANTS } from 'appConstants';
import isEmpty = require('lodash/isEmpty');
import isArray = require('lodash/isArray');
import { appConfig } from 'config';
import User from 'models/UserModel';

export interface Props {
  selectedUserId: string;
}

export interface State {
  selectedStatDisplayType?: number;
  historyStats?: any;
  selectedStatsInterval?: number;
  selectedDate?: Date;
}

class HistoryStatsContainer extends React.Component<Props, State> {
  private statsIntervalOptions: any[] = [];
  private statsDisplayType: any[] = [];
  private BLANK_HISTORY_STATE_OBJECT = {
    [StatsIntervalOptions.Daily]: null,
    [StatsIntervalOptions.Weekly]: null,
    [StatsIntervalOptions.Monthly]: null,
    [StatsIntervalOptions.Yearly]: null
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedStatDisplayType: appConfig.defaultStatDisplayType,
      historyStats: {
        ...this.BLANK_HISTORY_STATE_OBJECT
      },
      selectedDate: new Date()
    };
    this.statsIntervalOptions = convertEnumToArray(StatsIntervalOptions);
    this.statsDisplayType = convertEnumToArray(StatsDisplayTypes);
  }

  public componentDidMount() {
    this.fetchInitialStatsData();
  }

  public componentDidUpdate(prevProps: Props, prevState: State) {
    const { selectedUserId: previousSelectedUser } = prevProps;
    const { selectedUserId: newSelectedUser } = this.props;

    if (newSelectedUser !== previousSelectedUser && newSelectedUser !== '') {
      console.log(`Selected user changed : `, newSelectedUser, previousSelectedUser);
      this.fetchStats(undefined, newSelectedUser, undefined, StatsDataFetchingCases.user);
    }
  }

  public handleStatIntervalChange = e => {
    console.log(`Stat interval changed : `, e.target.value);
    // this.setState()
    const newStatInterval: number = Number(e.target.value);
    const existingDataForNewInterval: IYoutubeDayStats = this.state.historyStats[newStatInterval];

    if (isEmpty(existingDataForNewInterval)) {
      console.log(`Data doesn't exists for this interval...fetching data`);
      this.fetchStats(undefined, undefined, newStatInterval, StatsDataFetchingCases.interval);
    } else {
      // @priority medium
      // TODO - Update new stats interval here as well for the active user
      console.log(`Data already exists for this interval...no fetch`, existingDataForNewInterval);
      this.setState({
        selectedStatsInterval: newStatInterval
      });
    }
  };

  public handleStatsDateChange = newSelectedDate => {
    console.log(`Inside handle active date change...`, newSelectedDate);
    this.fetchStats(newSelectedDate, undefined, undefined, StatsDataFetchingCases.date);
  };

  public handleStatDisplayTypeChange = newDisplayTypeValue => {
    console.log(`New display type value is :`, newDisplayTypeValue);
    this.setState({
      selectedStatDisplayType: newDisplayTypeValue
    });
  };

  public async fetchInitialStatsData() {
    const selectedUserId: string = this.props.selectedUserId;
    const user: User = new User(selectedUserId);

    let selectedStatsInterval: number = await user.get(`lastAccessedStatsInterval`);
    console.log(`Selected stats interval fetched from user db are :`, selectedStatsInterval);
    if (isEmpty(selectedStatsInterval)) {
      selectedStatsInterval = appConfig.defaultStatsInterval;
    }
    console.log(`fetchInitialStatsData : `, selectedStatsInterval);

    this.setState(
      {
        selectedStatsInterval
      },
      () => {
        // console.log(`Fetching initial stats : `);
        this.fetchStats(
          undefined,
          undefined,
          selectedStatsInterval,
          StatsDataFetchingCases.interval
        );
      }
    );
  }

  /**
   * TODO : convert params to single object
   */
  public fetchStats = async (
    newSelectedDate = this.state.selectedDate,
    newSelectedUserId = this.props.selectedUserId,
    newSelectedStatsInterval = this.state.selectedStatsInterval,
    statsDataFetchingCase: StatsDataFetchingCases
  ) => {
    // console.log(`Sending message to abckground script to fetch history stats : `, selectedDate, selectedUserId);
    const requestData = {
      selectedStatsInterval: newSelectedStatsInterval,
      selectedDate: newSelectedDate,
      selectedUserId: newSelectedUserId
    };

    const response: IYoutubeDayStats[] = await this.fetchStatsDataFromBackground(requestData);

    if (!isEmpty(response)) {
      const { historyStats } = this.state;
      const lastLoadedHistoryStats: IYoutubeDayStats[] =
        historyStats[newSelectedStatsInterval] || [];
      const newHistoryStats: IYoutubeDayStats[] =
        statsDataFetchingCase === StatsDataFetchingCases.loadMore
          ? lastLoadedHistoryStats.concat(response)
          : response;

      this.setState(prevState => {
        const statsForOtherIntervals =
          statsDataFetchingCase === StatsDataFetchingCases.interval ||
          statsDataFetchingCase === StatsDataFetchingCases.loadMore
            ? prevState.historyStats
            : this.BLANK_HISTORY_STATE_OBJECT;
        const newState =
          statsDataFetchingCase === StatsDataFetchingCases.loadMore
            ? {}
            : {
                selectedStatsInterval: newSelectedStatsInterval,
                selectedDate: newSelectedDate,
                selectedUserId: newSelectedUserId
              };

        return {
          ...newState,
          historyStats: {
            ...statsForOtherIntervals,
            [newSelectedStatsInterval]: newHistoryStats
          }
        };
      });
    }
  };

  public handleLoadMoreClick = (historyStats: IYoutubeDayStats[]) => {
    const lastLoadedHistoryStat: IYoutubeDayStats = historyStats[historyStats.length - 1];
    const lastLoadedHistoryStatDateRange: string | string[] = lastLoadedHistoryStat.watchedOnDate;
    let lastLoadedHistoryDateString: string, lastLoadedHistoryStatDate: Date;

    if (isArray(lastLoadedHistoryStatDateRange)) {
      lastLoadedHistoryDateString = lastLoadedHistoryStatDateRange[0];
    } else {
      lastLoadedHistoryDateString = lastLoadedHistoryStatDateRange;
    }

    lastLoadedHistoryStatDate = new Date(lastLoadedHistoryDateString);
    lastLoadedHistoryStatDate = new Date(
      lastLoadedHistoryStatDate.getTime() - APP_CONSTANTS.DAY_IN_MS
    ); // need previous week, month and so on
    console.log(
      `Clicked on handle load more click...last loaded date was : `,
      historyStats,
      lastLoadedHistoryStat,
      lastLoadedHistoryStatDate
    );
    this.fetchStats(
      lastLoadedHistoryStatDate,
      undefined,
      undefined,
      StatsDataFetchingCases.loadMore
    );
  };

  public fetchStatsDataFromBackground(data): Promise<IYoutubeDayStats[]> {
    return new Promise(resolve => {
      sendMessageToBackgroundScript(
        {
          type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.FETCH_STATS_FOR_INTERVAL,
          data: {
            ...data,
            loadCount: appConfig.defaultStatsLoadCount
          }
        },
        ExtensionModule.Popup,
        (response: IYoutubeDayStats[]) => {
          resolve(response);
        }
      );
    });
  }

  public render() {
    const { historyStats, selectedStatsInterval, selectedDate } = this.state;
    const { selectedStatDisplayType } = this.state;
    const selectedIntervalHistoryStats: any = historyStats[selectedStatsInterval] || [];

    console.log(
      `History stats rendering... `,
      selectedStatsInterval,
      selectedStatDisplayType,
      historyStats
    );
    return (
      <section>
        {selectedStatsInterval && (
          <section className="my-1">
            <DatePicker selected={selectedDate} onChange={this.handleStatsDateChange} />
            <select value={selectedStatsInterval} onChange={this.handleStatIntervalChange}>
              {this.statsIntervalOptions.map(({ name, value }) => (
                <option value={value} key={`key_${value}`}>
                  {name}
                </option>
              ))}
            </select>

            <div>
              {this.statsDisplayType.map(({ name, value }) => (
                <span
                  className={selectedStatDisplayType === value ? 'active' : ''}
                  key={`key_${name}`}
                  onClick={this.handleStatDisplayTypeChange.bind(this, value)}
                >
                  {name}
                </span>
              ))}
            </div>
            <React.Fragment>
              {selectedStatDisplayType === StatsDisplayTypes.Table ? (
                <StatsTabularView
                  selectedStatsInterval={selectedStatsInterval}
                  selectedIntervalHistoryStats={selectedIntervalHistoryStats}
                />
              ) : (
                <StatsGraphicalView
                  selectedStatsInterval={selectedStatsInterval}
                  selectedIntervalHistoryStats={selectedIntervalHistoryStats}
                />
              )}
              <button onClick={this.handleLoadMoreClick.bind(this, selectedIntervalHistoryStats)}>
                Load More
              </button>
            </React.Fragment>
          </section>
        )}
      </section>
    );
  }
}

export default HistoryStatsContainer;
