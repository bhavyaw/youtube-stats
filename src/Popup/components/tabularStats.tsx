import * as React from 'react';
import { IYoutubeDayStats } from 'interfaces';
import appStrings from 'appStrings';
import isEmpty = require('lodash/isEmpty');
import { statDisplayFields } from 'config';

export interface Props {
  selectedStatsInterval: number;
  selectedIntervalHistoryStats: IYoutubeDayStats[];
  parentStyles;
}

export interface State {}

class HistoryTabularStats extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  render() {
    const { selectedStatsInterval, selectedIntervalHistoryStats, parentStyles } = this.props;
    const displayFields = statDisplayFields[selectedStatsInterval];

    console.log(`Tabular stats rendering... `, selectedIntervalHistoryStats, displayFields);

    return (
      <section className={`mb-1 ${parentStyles.tabularViewContainer}`}>
        {isEmpty(selectedIntervalHistoryStats) && selectedStatsInterval ? null : (
          <table className="table table-striped mb-2">
            <thead className="thead-light">
              {
                <tr>
                  {displayFields.map(displayField => (
                    <th className="py-0 font-weight-normal" key={`key_${displayField}`}>
                      {appStrings.statsFieldDisplayNames[displayField]}
                    </th>
                  ))}
                </tr>
              }
            </thead>
            <tbody>
              {selectedIntervalHistoryStats.map((historyStat: IYoutubeDayStats) => (
                <tr key={historyStat.watchedOnDate.toString()}>
                  {displayFields.map(displayField => (
                    <td className="py-0" key={`key_${displayField}`}>
                      {historyStat[displayField]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    );
  }
}

export default HistoryTabularStats;
