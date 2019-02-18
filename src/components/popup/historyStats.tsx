import * as React from 'react';
import HistoryTabularStats from './tabularStats';
import HistoryGraphicalStats from './graphicalStats';
import { StatsIntervalOptions, StatsDisplayTypes, appConfig } from "config";
import { IHistoryStats } from 'models';
import isEmpty = require('lodash/isEmpty');
import { convertEnumToArray } from 'common/utils';

export interface Props {
  fetchStats(activeStatInterval: number, selectedDate: Date): void,
  historyStats: any
}

export interface State {
  selectedStatInterval: number,
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
      selectedStatInterval: appConfig.defaultStatsInterval,
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
    const activeStatsInterval: number = appConfig.defaultStatsInterval;
    this.props.fetchStats(activeStatsInterval, this.state.selectedDate);
  }

  handleStatIntervalChange = (e) => {
    console.log(`Stat interval changed : `, e, e.target, e.target.value);
    // this.setState()
    const newStatInterval: string = e.target.value;
    // this.props.onStatIntervalChange(newStatInterval);
  }

  handleStatDisplayTypeChange = (newDisplayTypeValue) => {
    console.log(`New display type value is :`, newDisplayTypeValue);
    this.setState({
      selectedStatDisplayType: newDisplayTypeValue
    });
  }

  render() {
    const { historyStats } = this.props;
    const { selectedStatInterval, selectedStatDisplayType } = this.state;

    console.log(`History stats render function : `, selectedStatInterval, selectedStatDisplayType);
    return (
      <section>
        {
          !isEmpty({})
          &&
          <div>
            (<select
              value={selectedStatInterval}
              onChange={this.handleStatIntervalChange}>
              {
                this.statsIntervalOptions.map(({ name, value }) =>
                  (
                    <option value={value} key={value}>{value}</option>
                  ))
              }
            </select>

            <br />

            <div>
              {
                this.statsDisplayType.map(({ key: displayTypeValue, value: displayTypeName }) => (
                  <span className={selectedStatDisplayType === displayTypeValue ? "active" : ""}
                    key={`key_${displayTypeValue}`}
                    onClick={this.handleStatDisplayTypeChange.bind(this, displayTypeValue)}>
                    {displayTypeName}
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