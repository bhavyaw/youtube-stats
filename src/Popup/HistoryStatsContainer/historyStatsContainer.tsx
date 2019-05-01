import * as React from 'react';
import StatsTabularView from '../components/tabularStats';
import StatsGraphicalView from '../components/graphicalStats';
import {
  StatsIntervalOptions,
  StatsDisplayTypes,
  StatsDataFetchingCases,
  ExtensionModule
} from 'interfaces';
import { convertEnumToArray, sendMessageToBackgroundScript } from 'common/utils';
import { IYoutubeDayStats } from 'interfaces';

import 'react-datepicker/dist/react-datepicker.css';
import { APP_CONSTANTS } from 'appConstants';
import isEmpty = require('lodash/isEmpty');
import isArray = require('lodash/isArray');
import { appConfig } from 'config';
import User from 'models/UserModel';

import * as Styles from './HistoryStatsContainer.module.scss';
import StatsFinderControls from './StatsFinderControls';

export interface Props {
  selectedUserId: string;
}

export interface State {
  selectedStatDisplayType?: number;
  historyStats?: any;
  selectedStatsInterval?: number;
  selectedDate?: Date;
  fetchingStatsInProgress: boolean;
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
      selectedDate: new Date(),
      fetchingStatsInProgress: true
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

  public handleStatDisplayTypeChange = e => {
    let newDisplayTypeValue: string | number = e.target.value as string;
    newDisplayTypeValue = Number(newDisplayTypeValue);
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
    this.setState(
      {
        fetchingStatsInProgress: true
      },
      async () => {
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
              },
              fetchingStatsInProgress: false
            };
          });
        }
      }
    );
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
    const { selectedStatDisplayType, fetchingStatsInProgress } = this.state;
    const selectedIntervalHistoryStats: any = historyStats[selectedStatsInterval] || [];

    console.log(
      `History stats rendering... `,
      selectedStatsInterval,
      selectedStatDisplayType,
      historyStats
    );
    return selectedStatsInterval ? (
      <section className={`${Styles.statsFinder} card shadow-sm`}>
        <section className="card-header px-2 py-0">Stats Finder</section>
        <section className="card-body py-0 px-2">
          <StatsFinderControls
            selectedDate={selectedDate}
            fetchingStatsInProgress={fetchingStatsInProgress}
            selectedStatsInterval={selectedStatsInterval}
            selectedStatDisplayType={selectedStatDisplayType}
            onIntervalStatsChange={this.handleStatIntervalChange}
            handleStatDisplayTypeChange={this.handleStatDisplayTypeChange}
            onStatsDateChange={this.handleStatsDateChange}
            parentStyles={Styles}
            statsIntervalOptions={this.statsIntervalOptions}
            statsDisplayTypes={this.statsDisplayType}
          />
          {fetchingStatsInProgress && (
            <div className={`${Styles.spinnerGrowCustom} spinner-grow text-primary`} />
          )}

          {selectedStatDisplayType === StatsDisplayTypes['Tabular View'] ? (
            <StatsTabularView
              selectedStatsInterval={selectedStatsInterval}
              selectedIntervalHistoryStats={selectedIntervalHistoryStats}
              parentStyles={Styles}
            />
          ) : (
            <StatsGraphicalView
              parentStyles={Styles}
              selectedStatsInterval={selectedStatsInterval}
              selectedIntervalHistoryStats={selectedIntervalHistoryStats}
            />
          )}
          {selectedIntervalHistoryStats.length > 0 && (
            <button
              className="btn btn-outline-primary rounded-0 py-0 w-100 mb-1"
              disabled={fetchingStatsInProgress}
              onClick={this.handleLoadMoreClick.bind(this, selectedIntervalHistoryStats)}
            >
              Load More
            </button>
          )}
        </section>
      </section>
    ) : null;
  }
}

export default HistoryStatsContainer;
