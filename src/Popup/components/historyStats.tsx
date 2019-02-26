import * as React from 'react';
import StatsTabularView from './tabularStats';
import StatsGraphicalView from './graphicalStats';
import { StatsIntervalOptions, StatsDisplayTypes, appConfig } from "config";
import { convertEnumToArray, sendMessageToBackgroundScript } from 'common/utils';
import DatePicker from "react-datepicker";
import { storeAsync as store } from 'chrome-utils';
import { IYoutubeDayStats } from "models";

import "react-datepicker/dist/react-datepicker.css";
import { APP_CONSTANTS } from 'appConstants';
import isEmpty = require('lodash/isEmpty');
 

export interface Props {
  selectedUserId : string
}

export interface State {
  selectedStatDisplayType: number,
  historyStats ?: any,
  selectedStatsInterval ?: number,
  selectedDate: Date 
}

class HistoryStats extends React.Component<Props, State> {
  private statsIntervalOptions: any[] = [];
  private statsDisplayType: any[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {  
      selectedStatDisplayType: appConfig.defaultStatDisplayType,
      historyStats : {
        [StatsIntervalOptions.Daily] : null,
        [StatsIntervalOptions.Weekly] : null,
        [StatsIntervalOptions.Monthly] : null,
        [StatsIntervalOptions.Yearly] : null,
      },
      selectedDate: new Date()
    };
    console.log(`historyStats constructor : `, this.state, appConfig);
    this.statsIntervalOptions = convertEnumToArray(StatsIntervalOptions);
    this.statsDisplayType = convertEnumToArray(StatsDisplayTypes);
  }

  componentDidMount() {
    this.fetchInitialStatsData();
  }

  //WARNING! To be deprecated in React v17. Use new lifecycle static getDerivedStateFromProps instead.
  componentWillReceiveProps(nextProps: Props) {
    
  }

  handleStatIntervalChange = (e) => {
    console.log(`Stat interval changed : `, e.target.value);
    // this.setState()
    const newStatInterval: number = Number(e.target.value);
    this.fetchStats(undefined, undefined, newStatInterval);
  }

  handleStatsDateChange = (newSelectedDate) => {
    console.log(`Inside handle active date change...`, newSelectedDate);
    this.fetchStats(newSelectedDate);
  }

  handleStatDisplayTypeChange = (newDisplayTypeValue) => {
    console.log(`New display type value is :`, newDisplayTypeValue);
    this.setState({
      selectedStatDisplayType: newDisplayTypeValue
    });
  }

  async fetchInitialStatsData() {
    let selectedStatsInterval : number = await store.get(`lastAccessedStatsInterval`);
    selectedStatsInterval = selectedStatsInterval || appConfig.defaultStatsInterval;
    console.log(`fetchInitialStatsData : `, selectedStatsInterval);

    this.setState({
      selectedStatsInterval
    }, () => {
      console.log(`Fetching initial stats : `);
      this.fetchStats(undefined, undefined, selectedStatsInterval);
    });
  }

  fetchStats = async(
    selectedDate = this.state.selectedDate, 
    userId = this.props.selectedUserId, 
    selectedStatsInterval = this.state.selectedStatsInterval,
    loadMoreCase = false
  ) => {
    console.log(`Sending message to abckground script to fetch history stats : `, selectedDate, userId);
    const requestData = {
      selectedStatsInterval, 
      selectedDate,
      userId
    };

    const response : IYoutubeDayStats[] = await this.fetchStatsDataFromBackground(requestData);

    if (!isEmpty(response)) {
      const {historyStats} = this.state; 
      const lastLoadedHistoryStats : IYoutubeDayStats[] = historyStats[selectedStatsInterval] || [];
      const newHistoryStats : IYoutubeDayStats[] = loadMoreCase ? lastLoadedHistoryStats.concat(response) : response;

      let newState:any;
      if (!loadMoreCase) {
        newState = {
          selectedStatsInterval,
          selectedDate
        };
      }

      this.setState(prevState => ({
          ...newState,
          historyStats : {
            ...prevState.historyStats,
            [selectedStatsInterval] : newHistoryStats
          }
      }));
    }
  }

  fetchStatsDataFromBackground(data) : Promise<IYoutubeDayStats[]>{
    return new Promise(resolve => {
      sendMessageToBackgroundScript({
        type: APP_CONSTANTS.DATA_EXCHANGE_TYPE.FETCH_STATS_FOR_INTERVAL,
        data: {
          ...data,
          loadCount: appConfig.defaultStatsLoadCount
        }
      }, (response : IYoutubeDayStats[]) => {
        resolve(response);
      }, APP_CONSTANTS.SENDER.POPUP);
    });
  }

  render() {
    const { historyStats, selectedStatsInterval, selectedDate } = this.state;
    const { selectedStatDisplayType } = this.state;

    console.log(`History stats render function : `, selectedStatsInterval, selectedStatDisplayType, historyStats);
    return (
      <section>
        {
          selectedStatsInterval
          &&
          <div>
            <DatePicker 
               selected={selectedDate}
               onChange={this.handleStatsDateChange}
            />
            <select
              value={selectedStatsInterval}
              onChange={this.handleStatIntervalChange}>
              {
                this.statsIntervalOptions.map(({ name, value }) => (
                  <option value={value} key={`key_${value}`}>{name}</option>
                ))
              }
            </select>

            <br />

            <div>
              {
                this.statsDisplayType.map(({ name, value }) => (
                  <span className={selectedStatDisplayType === value ? "active" : ""}
                    key={`key_${name}`}
                    onClick={this.handleStatDisplayTypeChange.bind(this, value)}>
                    {name}
                  </span>
                ))
              }
            </div>

            {
              (selectedStatDisplayType === StatsDisplayTypes.Table)
                ? <StatsTabularView
                    selectedStatsInterval={selectedStatsInterval}
                    historyStats={historyStats}
                    fetchStats={this.fetchStats}
                  />
                : <StatsGraphicalView
                  historyStats={historyStats}
                />
            }

          </div>
        }

      </section>
    );
  }
}

export default HistoryStats;