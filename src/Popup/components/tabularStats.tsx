import * as React from 'react';
import { IHistoryStats, IYoutubeDayStats } from 'models';
import appStrings from 'appStrings';
import isEmpty = require('lodash/isEmpty');
import { statDisplayFields, StatsIntervalOptions } from 'config';
import isArray = require('lodash/isArray');
import { APP_CONSTANTS } from 'appConstants';

export interface Props {
  historyStats: IHistoryStats[],
  selectedStatsInterval : number,
  fetchStats(lastLoadedHistoryStatDate ?: Date, selectedUserId ?: string, selectedStatsInterval ?: StatsIntervalOptions, loadMoreCase ?: Boolean)
}

export interface State {

}

class HistoryTabularStats extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  handleLoadMoreClick = (historyStats : IYoutubeDayStats[]) => {
    const lastLoadedHistoryStat : IYoutubeDayStats = historyStats[historyStats.length - 1]
    let lastLoadedHistoryStatDateRange : string | string[] = lastLoadedHistoryStat.watchedOnDate;
    let lastLoadedHistoryDateString : string, lastLoadedHistoryStatDate : Date;

    if (isArray(lastLoadedHistoryStatDateRange)) {
      lastLoadedHistoryDateString = lastLoadedHistoryStatDateRange[0];

    } else {
      lastLoadedHistoryDateString = lastLoadedHistoryStatDateRange;
    }

    lastLoadedHistoryStatDate  = new Date(lastLoadedHistoryDateString);
    lastLoadedHistoryStatDate = new Date(lastLoadedHistoryStatDate.getTime() - APP_CONSTANTS.DAY_IN_MS); // need previous week, month and so on
    console.log(`Clicked on handle load more click...last loaded date was : `,historyStats, lastLoadedHistoryStat, lastLoadedHistoryStatDate);
    this.props.fetchStats(lastLoadedHistoryStatDate, undefined, undefined, true);
  }

  render() {
    const {historyStats, selectedStatsInterval} = this.props;
    const selectedIntervalHistoryStats : any = historyStats[selectedStatsInterval] || {};
    const displayFields = statDisplayFields[selectedStatsInterval];

    console.log(`Tabular stats render method : `, historyStats, selectedIntervalHistoryStats, displayFields);

    return (
      <section>
        {
          isEmpty(selectedIntervalHistoryStats) && selectedStatsInterval
          ? null
          : 
          <div>
            <table>
              <thead>
                {
                  <tr>
                    {
                      displayFields.map(displayField => (
                        <th
                          key={`key_${displayField}`}
                        >
                          {appStrings.statsFieldDisplayNames[displayField]}
                        </th>
                      ))
                    }
                  </tr>
                }
              </thead>
              <tbody>
                {
                  selectedIntervalHistoryStats.map((historyStat : IYoutubeDayStats) => (
                    <tr
                      key={historyStat.watchedOnDate.toString()}
                    >
                      {
                        displayFields.map(displayField => 
                          (<td
                            key={`key_${displayField}`}
                          >
                            {historyStat[displayField]}
                          </td>))
                      }
                    </tr>
                  ))
                }
              </tbody>
            </table>
            <button onClick={this.handleLoadMoreClick.bind(this, selectedIntervalHistoryStats)}>Load More</button>
          </div>
        }
      </section>
    );
  }
}

export default HistoryTabularStats;