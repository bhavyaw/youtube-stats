import get = require("lodash/get");
import set = require("lodash/set");
import isArray = require("lodash/isArray");
import isString = require("lodash/isString");
import isObject = require("lodash/isObject");
import toLower = require("lodash/toLower");
import { stringOrArr, chromeStorage, storeType } from "models";

export default abstract class BaseModel {
  private store : chromeStorage;
  private tableName : string;

  constructor() {
    this.store = chrome.storage.local; // default store
    if (this.constructor.name !== BaseModel.name) {
      this.tableName = toLower(this.constructor.name); 
      this.updateTopLevelSchema();
    } 
  }

  protected async get(dataLocation : stringOrArr, storeType ?: storeType) {
    let accessStore : chromeStorage = this.store;
    dataLocation = this.getAbsoluteDataLocation(dataLocation);

    if (storeType) {
      accessStore = chrome.storage[storeType];
    }

    const topLevelDataLocation : string = dataLocation[0];
    const topLevelData : any = await new Promise(resolve => {
      accessStore.get(topLevelDataLocation, (item = null) => {
        resolve(item);
      });
    });
      
    const data : any = get(topLevelData, dataLocation);  
    return data;
  } 

  protected async set(dataOrLocation, value, appendData = false, storeType ?: storeType) {
    let accessStore : chromeStorage = this.store;
    
    if (storeType) {
      accessStore = chrome.storage[storeType];
    }

    if (isString(dataOrLocation) || isArray(dataOrLocation)) {
      this.setDataAtLocation(dataOrLocation, value, appendData, accessStore);
    } else if (isObject(dataOrLocation)) {
      await new Promise(resolve => {
        accessStore.set(dataOrLocation, () => {
          resolve();
        });
      });
    }
  }

  private async setDataAtLocation(dataLocation, value : any, appendData : boolean, accessStore : chromeStorage) {
    dataLocation = this.getAbsoluteDataLocation(dataLocation);

    const topLevelKey  = dataLocation[0];
    const topLevelData : any = await new Promise(resolve => {
      accessStore.get(topLevelKey, (item) => {
        resolve(item);
      });
    });

    // setting data
    const lowestLevelData : any = get(topLevelData, dataLocation);

    if (isArray(lowestLevelData) && appendData) {
      set(topLevelData, dataLocation, lowestLevelData.concat(value));
    } else {
      set(topLevelData, dataLocation, value);
    }

    await new Promise(resolve => {
      accessStore.set({
        [topLevelKey] : topLevelData
      }, () => {
        const data = get(topLevelData, dataLocation);
        resolve(data);
      });
    });
    
    set(topLevelData, dataLocation, value);
  }

  private getAbsoluteDataLocation(keyPath : stringOrArr) {
    if (!keyPath || !keyPath.length) {
      throw new Error("BaseModel.ts - KeyPath cannot be empty");
    }

    if (isString(keyPath)) {
      keyPath = keyPath.split(/\[|\]|\./);
      keyPath = keyPath.map(keys => keys.trim());
      keyPath = keyPath.filter(key => key !== "");
    }

    return keyPath;
  }

  private async updateTopLevelSchema () {
    const existingTables  = await this.get("tables");
    if (!existingTables.indexOf(this.tableName)) {
      await this.set("tables", this.tableName, true);
    }
  }

  public async getTopLevelSchema() {
    return this.get("tables");
  }
}