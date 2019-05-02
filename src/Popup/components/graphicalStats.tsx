import * as React from 'react';
import { IYoutubeDayStats } from 'interfaces';
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Brush, Bar } from 'recharts';
import { statDisplayFields } from 'config';
import isEmpty = require('lodash/isEmpty');
import { APP_MESSAGES } from 'appMessages';
import { convertDurationToProperFormat } from 'common/utils';

export interface Props {
  selectedStatsInterval: number;
  selectedIntervalHistoryStats: IYoutubeDayStats[];
  parentStyles;
}

export interface State {}

class HistoryGraphicalStats extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }
  render() {
    const { selectedStatsInterval, selectedIntervalHistoryStats, parentStyles } = this.props;
    const graphData = selectedIntervalHistoryStats.slice().reverse();
    const displayFields = statDisplayFields[selectedStatsInterval];

    console.log(`Tabular stats rendering... `, selectedIntervalHistoryStats, displayFields);
    return (
      <section className={`${parentStyles.graphicalViewContainer} mb-1`}>
        {!isEmpty(selectedIntervalHistoryStats) && (
          <BarChart width={500} height={200} data={graphData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="formattedDate" />
            <YAxis
              tickFormatter={watchedDuration => convertDurationToProperFormat(watchedDuration, 2)}
            />
            <Tooltip
              formatter={(value, name, props) => {
                const { payload, dataKey } = props;
                const statsFieldDisplayNames = APP_MESSAGES.statsFieldDisplayNames;

                if (dataKey === 'totalCount') {
                  return [payload[dataKey], statsFieldDisplayNames[dataKey]];
                } else if (dataKey === 'totalWatchedDuration') {
                  return [payload['formattedDuration'], statsFieldDisplayNames[dataKey]];
                }
              }}
            />
            <Legend />
            <Brush dataKey="formattedDate" height={15} stroke="#8884d8" />
            <Bar
              dataKey="totalCount"
              fill="#8884d8"
              name="Video Count"
              minPointSize={2}
              label={false}
            />
            <Bar
              dataKey="totalWatchedDuration"
              fill="#82ca9d"
              name="Watched Duration"
              minPointSize={2}
              label={false}
            />
          </BarChart>
        )}
      </section>
    );
  }
}

export default HistoryGraphicalStats;
