import { numberOrString } from '../interfaces';
import { appConfig } from 'config';
import { IYoutubeVideo } from 'interfaces';
import BaseModel from "./BaseModel";
import { StatsIntervalOptions } from 'interfaces';

export default class User extends BaseModel {
  private lastSavedVideo : IYoutubeVideo | any = {};
  private continuationDataFetchingParam : string = null;
  private lastRun : number = null;
  private lastAccessedStatsInterval : StatsIntervalOptions = appConfig.defaultStatsInterval;
  private statsCache : any = {};

  constructor(userId : numberOrString, setDefaults = false, storeType?) {
    super(storeType, userId);
    if (setDefaults) {
      this.setDefaults();
    }
  }
}