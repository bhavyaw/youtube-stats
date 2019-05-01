import * as React from 'react';
import { Component } from 'react';
import { convertDurationToProperFormat } from 'common/utils';

export interface Props {
  stats: any;
}

export interface State {}

class CumulativeStats extends Component<Props, State> {
  constructor(props, state) {
    super(props, state);
  }

  render() {
    const { stats } = this.props;
    return (
      <section className="card my-3 shadow-sm">
        <div className="card-header py-0 px-2 ">Cumulative Stats</div>
        <div className="card-body py-0 px-1">
          <table className="table mb-0">
            <tbody>
              <tr>
                <td className="py-0">Total Watched Videos</td>
                <td className="pl-5 py-0">{stats.totalCount}</td>
              </tr>
              <tr>
                <td className="py-0">Total Watched Duration</td>
                <td className="pl-5 py-0">
                  {convertDurationToProperFormat(stats.totalWatchedDuration)}
                </td>
              </tr>
              <tr>
                <td className="py-0">Total Active days</td>
                <td className="pl-5 py-0">{stats.totalActiveDays}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  }
}

export default CumulativeStats;
