import { appConfig } from 'config';
import { IYoutubeVideo } from 'models';
import BaseModel from "./BaseModel";
import { StatsIntervalOptions } from 'models';
import isEmpty = require('lodash/isEmpty');
import isString = require('lodash/isString');
import isNil = require('lodash/isNil');

export default class User extends BaseModel {
  public id : string; //user id
  private workingId : string 
  private lastSavedVideo : IYoutubeVideo | {} = {};
  private continuationDataFetchingParam : string = "";
  private lastRun : number = 0;
  private lastAccessedStatsInterval : StatsIntervalOptions = appConfig.defaultStatsInterval;
  /**
   *
   */
  constructor(userId : string) {
    super();
    if (isNil(userId)) {
      throw new Error(`Please enter a valid user id : ${userId}`);
    }
    this.id = userId;
    this.workingId = this.convertUserIdToSavableForm(userId);
  }

  getDetails(keyPath : Array<any>) {
    if (isNil(keyPath)) {
      return this.get()
    }
  }

  setDetails() {

  }

  convertUserIdToSavableForm(userId) {
    userId = userId.replace(".com", "");
    userId = userId.replace(/\./g, "_"); // replacing underscores with 
    return userId;
  }
}