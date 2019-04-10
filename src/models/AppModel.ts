import { numberOrString, RefreshIntervals } from 'interfaces';
import BaseModel from "./BaseModel";

export default class App extends BaseModel {
  private activeRefreshInterval : RefreshIntervals = RefreshIntervals.Weekly;
  private activeRefreshIntervalChangeDate : string = null;
  private lastActiveUser : numberOrString = null;

  constructor(setDefaults = false, storeType?) {
    super(storeType);
    if (setDefaults) {
      this.setDefaults();
    }
  }
}