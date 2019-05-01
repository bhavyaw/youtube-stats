import * as React from 'react';
import { Component } from 'react';
import { PopUpActiveViews } from 'interfaces';
import cx from 'classnames';

export interface Props {
  activeView: PopUpActiveViews;
  onClickHeaderNavItem(e: any, activeView: PopUpActiveViews);
}

export interface State {}

class PopupHeader extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      activeView: PopUpActiveViews.statsView
    };
  }

  render() {
    const { activeView, onClickHeaderNavItem } = this.props;
    const isStatsViewActive = activeView === PopUpActiveViews.statsView;
    const isSettingsViewActive = activeView === PopUpActiveViews.settingsView;
    const statsNavLinkClass = cx('nav-link py-1', isStatsViewActive ? 'active' : 'cursor-pointer');
    const settingsNavLinkClass = cx(
      'nav-link py-1',
      isSettingsViewActive ? 'active' : 'cursor-pointer'
    );

    return (
      <div className="card-header pt-1 pb-0 px-3">
        <ul className="nav nav-tabs card-header-tabs m-0">
          <li className="nav-item m-0">
            <a
              className={statsNavLinkClass}
              onClick={e => onClickHeaderNavItem(e, PopUpActiveViews.statsView)}
            >
              Stats
            </a>
          </li>
          <li className="nav-item">
            <a
              className={settingsNavLinkClass}
              onClick={e => onClickHeaderNavItem(e, PopUpActiveViews.settingsView)}
            >
              Settings
            </a>
          </li>
        </ul>
      </div>
    );
  }
}

export default PopupHeader;
