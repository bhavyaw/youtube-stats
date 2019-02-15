import * as React from 'react';
import { IHistoryStats } from 'models';

export interface Props {
  historyStats: IHistoryStats
}

export interface State {

}

class HistoryGraphicalStats extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }
  render() {
    return (
      <section>
        Graphical Stats
      </section>
    );
  }
}

export default HistoryGraphicalStats;