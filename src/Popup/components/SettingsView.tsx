import * as React from 'react';
import { RefreshIntervals, PopUpActiveViews } from 'interfaces';
import cx from 'classnames';

export interface Props {
  activeRefreshInterval: number;
  onRefreshIntervalChange(newRefreshIntervalValue: number);
  activeView: PopUpActiveViews;
}

export interface State {}

class SettingsView extends React.Component<Props, State> {
  private refreshIntervalOptions: any = [];

  constructor(props: Props) {
    super(props);
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
  }

  handleRefreshIntervalChange(newRefreshIntervalValue, e) {
    console.log(`New Refresh Interval is : `, newRefreshIntervalValue, e);
    this.props.onRefreshIntervalChange(newRefreshIntervalValue);
  }

  render() {
    const { activeRefreshInterval, activeView } = this.props;
    const isActiveViewSettings = activeView === PopUpActiveViews.settingsView;
    const settingsViewActiveClass = cx('tab-pane', isActiveViewSettings && 'active');
    console.log(
      `RefreshInterval rendering... `,
      activeRefreshInterval,
      activeView,
      settingsViewActiveClass
    );

    return (
      <section className={settingsViewActiveClass}>
        <section className="p-1 row">
          <legend className="col-form-label col-4 pt-0 text-secondary">
            Stats Refresh Interval
          </legend>
          <div className="col-8">
            {this.refreshIntervalOptions.map(({ intervalName, intervalValue }, index) => {
              return (
                <div key={intervalName} className="custom-control custom-radio">
                  <input
                    type="radio"
                    id={`refresh-intervals-${index}`}
                    className="custom-control-input"
                    value={intervalName}
                    checked={intervalValue === activeRefreshInterval}
                    onChange={this.handleRefreshIntervalChange.bind(this, intervalValue)}
                  />
                  <label className="custom-control-label" htmlFor={`refresh-intervals-${index}`}>
                    {intervalName}
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    );
  }
}

export default SettingsView;

{
  /* // <div class="row">
//   <legend class="col-form-label col-sm-2 pt-0">Radios</legend>
//   <div class="col-sm-10">
//     <div class="custom-control custom-radio">
//       <input type="radio" id="customRadio1" name="customRadio" class="custom-control-input">
//       <label class="custom-control-label" for="customRadio1">Toggle this custom radio</label>
//     </div>
//   </div>
// </div> */
}
