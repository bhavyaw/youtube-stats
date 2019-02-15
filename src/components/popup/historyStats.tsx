import * as React from 'react';
import HistoryTabularStats from './tabularStats';
import HistoryGraphicalStats from './graphicalStats';
import { statsIntervalOptions, statsDisplayType, appConfig } from "config";
import forEach = require("lodash/forEach");
import { IHistoryStats } from 'models';
import isEmpty = require('lodash/isEmpty');

export interface Props {
  historyStats: IHistoryStats,
  onStatIntervalChange(newStatInterval: string)
}

export interface State {
  selectedStatInterval: string,
  selectedStatDisplayType: string
}

class HistoryStats extends React.Component<Props, State> {
  private statsIntervalOptions: any[] = [];
  private statsDisplayType: any[] = [];
  private dailyHistoryStats: IHistoryStats;

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedStatInterval: appConfig.defaultStatsInterval,
      selectedStatDisplayType: appConfig.defaultStatDisplayType
    };

    console.log(`historyStats constructor : `, this.state, appConfig);
    forEach(statsIntervalOptions, (key, value) => {
      this.statsIntervalOptions.push({
        key,
        value
      });
    });


    forEach(statsDisplayType, (key, value) => {
      this.statsDisplayType.push({
        key,
        value
      });
    });
  }

  handleStatIntervalChange = (e) => {
    console.log(`Stat interval changed : `, e, e.target, e.target.value);
    // this.setState()
    const newStatInterval: string = e.target.value;
    this.props.onStatIntervalChange(newStatInterval);
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

    console.log(`History stats render function : `, historyStats, selectedStatInterval, selectedStatDisplayType);
    return (
      <section>
        {
          !isEmpty(historyStats)
          &&
          <div>
            (<select
              value={selectedStatInterval}
              onChange={this.handleStatIntervalChange}>
              {
                this.statsIntervalOptions.map(({ key, value }) =>
                  (
                    <option value={key} key={key}>{value}</option>
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
              (selectedStatDisplayType === "Table")
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