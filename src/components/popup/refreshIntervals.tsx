import * as React from 'react';
import { RefreshIntervals } from "config";

export interface Props {
  activeRefreshInterval: number,
  onRefreshIntervalChange(newRefreshIntervalValue: number)
}

export interface State {

}

class RefreshInterval extends React.Component<Props, State> {
  private refreshIntervalOptions: any = [];

  constructor(props: Props) {
    super(props);
    this.state = {};
    for (const key in RefreshIntervals) {
      if (RefreshIntervals.hasOwnProperty(key)) {
        const value = RefreshIntervals[key];
        if (!isNaN(Number(value))) {
          this.refreshIntervalOptions.push({
            intervalName: key,
            intervalValue: Number(value)
          });
        }
      }
    }

    console.log(`Refresh Intervals are  : `, RefreshIntervals, this.refreshIntervalOptions);
  }

  handleRefreshIntervalChange(newRefreshIntervalValue, e) {
    console.log(`New Refresh Interval is : `, newRefreshIntervalValue, e);
    this.props.onRefreshIntervalChange(newRefreshIntervalValue);
  }

  render() {
    const { activeRefreshInterval } = this.props;

    console.log(`RefreshInterval component render method : `, activeRefreshInterval);

    return (
      <section>
        {
          this.refreshIntervalOptions.map(({ intervalName, intervalValue }) => {
            console.log(`Creating radio btns for refresh intervals : `, intervalName, intervalValue);
            return (
              <label
                key={intervalName}>
                <input
                  type="radio"
                  value={intervalName}
                  checked={intervalValue === activeRefreshInterval}
                  onChange={this.handleRefreshIntervalChange.bind(this, intervalValue)} />
                {intervalName}
              </label>);
          }
          )}
      </section>
    );
  }
}

export default RefreshInterval;


