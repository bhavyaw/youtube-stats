import * as React from 'react';
import { IHistoryStats, IYoutubeDayStats } from 'interfaces';
import { 
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Brush,
  Bar } from "recharts";
import { statDisplayFields } from 'config';
import isEmpty = require('lodash/isEmpty');
import appStrings from "appStrings";
import { convertDurationToProperFormat } from 'common/utils';

export interface Props {
  selectedStatsInterval : number,
  selectedIntervalHistoryStats : IYoutubeDayStats[]
}

export interface State {

}

class HistoryGraphicalStats extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {};
  }
  render() {
    const {selectedStatsInterval, selectedIntervalHistoryStats} = this.props;
    const graphData = selectedIntervalHistoryStats.slice().reverse();
    const displayFields = statDisplayFields[selectedStatsInterval];

    console.log(`Tabular stats rendering... `, selectedIntervalHistoryStats, displayFields);
    return (
      <React.Fragment>
        Graphical Stats
        <br/><br/>
        {
          !isEmpty(selectedIntervalHistoryStats) 
          && 
          <BarChart width={730} height={250} data={graphData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="formattedDate" />
            <YAxis 
              tickFormatter={watchedDuration => convertDurationToProperFormat(watchedDuration, 2)}
            />
            <Tooltip
              formatter={(value, name, props) => {
                const {payload, dataKey} = props;
                const statsFieldDisplayNames = appStrings.statsFieldDisplayNames;

                if (dataKey === "totalCount") {
                  return  [payload[dataKey], statsFieldDisplayNames[dataKey]];
                } else if (dataKey === "totalWatchedDuration") {
                  return  [payload["formattedDuration"], statsFieldDisplayNames[dataKey]];                  
                }
              }}
            />
            <Legend />
            <Brush dataKey='formattedDate' height={15} stroke="#8884d8"/>
            <Bar dataKey="totalCount" fill="#8884d8" name="Video Count" minPointSize={2} label={false} />
            <Bar dataKey="totalWatchedDuration" fill="#82ca9d" name="Watched Duration" minPointSize={2} label={false} />
          </BarChart>
        }
      </React.Fragment>
    );
  }
}

export default HistoryGraphicalStats;