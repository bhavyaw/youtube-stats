import * as React from 'react';
import { IHistoryStats, IYoutubeDayStats } from 'models';
import appStrings from 'appStrings';
import isEmpty = require('lodash/isEmpty');
import { statDisplayFields } from 'config';
import isArray = require('lodash/isArray');

export interface Props {
  historyStats: IHistoryStats[],
  selectedStatsInterval : number
}

export interface State {

}

class HistoryTabularStats extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  handleLoadMoreClick = (historyStats : IYoutubeDayStats[]) => {
    const lastLoadedHistoryStat : IYoutubeDayStats = historyStats.pop();
    let lastLoadedHistoryStatDate = lastLoadedHistoryStat.watchedOnDate;
    lastLoadedHistoryStatDate = isArray(lastLoadedHistoryStatDate) ? lastLoadedHistoryStatDate[1] : lastLoadedHistoryStatDate;
    console.log(`Clicked on handle load more click...last loaded date was : `,lastLoadedHistoryStat, lastLoadedHistoryStatDate);
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
            <button>onClick={this.handleLoadMoreClick.bind(this, selectedIntervalHistoryStats)}</button>
          </div>
        }
      </section>
    );
  }
}

export default HistoryTabularStats;