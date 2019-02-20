import * as React from 'react';
import HistoryTabularStats from './tabularStats';
import HistoryGraphicalStats from './graphicalStats';
import { StatsIntervalOptions, StatsDisplayTypes, appConfig } from "config";
import { IHistoryStats } from 'models';
import isEmpty = require('lodash/isEmpty');
import { convertEnumToArray } from 'common/utils';

export interface Props {
  fetchStats(selectedDate: Date, activeStatInterval ?: number): void,
  historyStats: any,
  selectedStatInterval: number
}

export interface State {
  selectedStatDisplayType: number,
  selectedDate: Date
}

class HistoryStats extends React.Component<Props, State> {
  private statsIntervalOptions: any[] = [];
  private statsDisplayType: any[] = [];
  private dailyHistoryStats: IHistoryStats;

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedStatDisplayType: appConfig.defaultStatDisplayType,
      selectedDate: new Date()
    };

    console.log(`historyStats constructor : `, this.state, appConfig);
    this.statsIntervalOptions = convertEnumToArray(StatsIntervalOptions);
    this.statsDisplayType = convertEnumToArray(StatsDisplayTypes);
  }

  componentDidMount() {
    this.fetchInitialStats();
  }

  fetchInitialStats() {
    this.props.fetchStats(this.state.selectedDate);
  }

  handleStatIntervalChange = (e) => {
    console.log(`Stat interval changed : `, e, e.target, e.target.value);
    // this.setState()
    const newStatInterval: number = Number(e.target.value);
    this.props.fetchStats(newStatInterval, this.state.selectedDate);
  }

  handleStatDisplayTypeChange = (newDisplayTypeValue) => {
    console.log(`New display type value is :`, newDisplayTypeValue);
    this.setState({
      selectedStatDisplayType: newDisplayTypeValue
    });
  }

  render() {
    const { historyStats, selectedStatInterval } = this.props;
    const { selectedStatDisplayType } = this.state;

    console.log(`History stats render function : `, selectedStatInterval, selectedStatDisplayType);
    return (
      <section>
        {
          selectedStatInterval
          &&
          <div>
            (<select
              value={selectedStatInterval}
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