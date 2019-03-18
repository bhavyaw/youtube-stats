import * as React from 'react';
import { IHistoryStats, IYoutubeDayStats } from 'models';
import appStrings from 'appStrings';
import isEmpty = require('lodash/isEmpty');
import { statDisplayFields } from 'config';
import isArray = require('lodash/isArray');
import { APP_CONSTANTS } from 'appConstants';

export interface Props {
  selectedStatsInterval : number,
  selectedIntervalHistoryStats : IYoutubeDayStats[],
}

export interface State {

}

class HistoryTabularStats extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  render() {
    const {selectedStatsInterval, selectedIntervalHistoryStats} = this.props;
    const displayFields = statDisplayFields[selectedStatsInterval];

    console.log(`Tabular stats rendering... `, selectedIntervalHistoryStats, displayFields);

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
          </div>
        }
      </section>
    );
  }
}

export default HistoryTabularStats;