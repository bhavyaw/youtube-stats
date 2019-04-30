import { numberOrString, RefreshIntervals } from 'interfaces';
import BaseModel from './BaseModel';
import { appConfig } from 'config';

export default class App extends BaseModel {
  public readonly activeRefreshInterval: RefreshIntervals = appConfig.defaultRefreshInterval;
  public readonly activeRefreshIntervalChangeDate: string = null;
  public readonly lastActiveUser: numberOrString = null;

  constructor(setDefaults = false, storeType?) {
    super(storeType);
    if (setDefaults) {
      this.saveDefaults();
    }
  }
}
