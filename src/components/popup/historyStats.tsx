import * as React from 'react';
import HistoryTabularStats from './tabularStats';
import HistoryGraphicalStats from './graphicalStats';
import { StatsIntervalOptions, StatsDisplayTypes, appConfig } from "config";
import { IHistoryStats } from 'models';
import { convertEnumToArray } from 'common/utils';
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";
 

export interface Props {
  fetchStats(selectedDate ?: Date, activeStatInterval ?: number): void,
  historyStats: any,
  selectedStatsInterval: number,
  selectedDate: Date
}

export interface State {
  selectedStatDisplayType: number
}

class HistoryStats extends React.Component<Props, State> {
  private statsIntervalOptions: any[] = [];
  private statsDisplayType: any[] = [];
  private dailyHistoryStats: IHistoryStats;

  constructor(props: Props) {
    super(props);
    this.state = {  
      selectedStatDisplayType: appConfig.defaultStatDisplayType
    };

    console.log(`historyStats constructor : `, this.state, appConfig);
    this.statsIntervalOptions = convertEnumToArray(StatsIntervalOptions);
    this.statsDisplayType = convertEnumToArray(StatsDisplayTypes);
  }

  componentDidMount() {
    this.fetchInitialStats();
  }

  fetchInitialStats() {
    console.log(`Fetching initial stats : `);
    this.props.fetchStats();
  }

  handleStatIntervalChange = (e) => {
    console.log(`Stat interval changed : `, e.target.value);
    // this.setState()
    const newStatInterval: number = Number(e.target.value);
    this.props.fetchStats(undefined, newStatInterval);
  }

  handleStatsDateChange = (newSelectedDate) => {
    console.log(`Inside handle active date change...`, newSelectedDate);
    this.props.fetchStats(newSelectedDate);
  }

  handleStatDisplayTypeChange = (newDisplayTypeValue) => {
    console.log(`New display type value is :`, newDisplayTypeValue);
    this.setState({
      selectedStatDisplayType: newDisplayTypeValue
    });
  }


  render() {
    const { historyStats, selectedStatsInterval, selectedDate } = this.props;
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
            (<select
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
                ? <HistoryTabularStats
                    selectedStatsInterval={selectedStatsInterval}
                    historyStats={historyStats}
                  />
                : <HistoryGraphicalStats
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