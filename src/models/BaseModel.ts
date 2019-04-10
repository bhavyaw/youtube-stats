import get = require("lodash/get");
import set = require("lodash/set");
import isArray = require("lodash/isArray");
import isString = require("lodash/isString");
import isObject = require("lodash/isObject");
import toLower = require("lodash/toLower");
import { stringOrArr, chromeStorage, storeType, numberOrString } from "interfaces";
import isEmpty = require("lodash/isEmpty");
import isNumber = require("lodash/isNumber");
import pickBy = require("lodash/pickBy");
import isFunction = require("lodash/isFunction");
import uniq = require("lodash/uniq");

export default abstract class BaseModel {
  private _store : chromeStorage = chrome.storage.local;
  private _idGetSetProp : string = null;
  private _tableNameGetSetProp : string;
  private _instanceDataGetSetProp : any;

  constructor(storeType ?: storeType, id ?: numberOrString) {
    if (storeType) {
      this._store = chrome.storage[storeType]; // default store
    }

    this._id = <string>(id);

    if (this.constructor.name !== BaseModel.name) {
      this._tableName = toLower(this.constructor.name); 
      this.updateTopLevelSchema();
    } 
  }

  
  private set _id(id : string) {
    if (!isEmpty(id)) {
      if (!isString(id) && !isNumber(id)) {
        throw new Error(`Id can be either string or a number. Please enter a valid id`);
      } 

      if (isString(id)) {
        id = id.replace(/\./g, "_"); // replacing underscores with 
      }

      if (isNumber(id)) {
        id = String(id);
      }
    }
    this._idGetSetProp = id;
  }

  private get _id () : string{
    return this._idGetSetProp;
  }

  private set _tableName (tableName : string) {
    this._tableNameGetSetProp = toLower(tableName);
  }

  private get _tableName() {
    return this._tableNameGetSetProp;
  }

  private set _instanceData({
    absoluteDataPath,
    topLevelData
  } : {
    absoluteDataPath : Array<string>,
    topLevelData : any
  }) {
    let instanceData : any;
    if (this._id) {
      absoluteDataPath.shift(); // removing table name
      instanceData = get(topLevelData, absoluteDataPath);
    } else {
      instanceData = get(topLevelData, absoluteDataPath)
    }
    this._instanceDataGetSetProp = instanceData;
  }

  private get _instanceData() {
    return this._instanceDataGetSetProp;
  }

  public async get(dataLocation ?: stringOrArr, getRaw ?: boolean) : Promise<any> {
    dataLocation = this.getAbsoluteDataLocation(dataLocation, getRaw);
    const dataFromInstance : any = this.getDataFromInstance(dataLocation);

    if (dataFromInstance) {
      return dataFromInstance;
    } else {
      const topLevelDataLocation : string = dataLocation[0];
      const topLevelData : any = await new Promise(resolve => {
        if (getRaw && !dataLocation.length) {
          this._store.get((data) => {
            resolve(data);
          });
        } else {
          this._store.get(topLevelDataLocation, (item = null) => {
            resolve(item);
          });
        }
      });
        
      const data : any = get(topLevelData, dataLocation);  
      return data;
    }
  } 

  private getDataFromInstance(dataLocation) : any | boolean{
    if (!isEmpty(this._tableName)) {
      const tableData : any = get(this._instanceData, dataLocation);
      return !isEmpty(tableData) ? tableData : false;
    }
  }

  public async set(dataOrLocation, value, rawAccess ?:boolean) : Promise<any> {
    if (isString(dataOrLocation) || isArray(dataOrLocation)) {
      return this.setDataAtLocation(value, dataOrLocation, rawAccess);
    } else if (isObject(dataOrLocation)) {
      return this.setDataAtLocation(dataOrLocation, "", rawAccess);
    }
  }

  public async getTopLevelSchema() {
    return this.get("tables");
  }

  private setRaw(dataOrLocation, value) : Promise<any>{
    return this.set(dataOrLocation, value, true);
  }

  private getRaw(dataLocation ?: stringOrArr)  {
    return this.get(dataLocation, true);
  }

  protected setDefaults() {
    let defaults = pickBy(this, (value, key) => {
      if (!isFunction(value) && !key.startsWith("_")) {
        return true;
      }
    });
    console.log(`Setting defaults for table ${this._tableName} : `, defaults);
    if (!isEmpty(defaults)) {
      this.setDataAtLocation(defaults);
    }
  }

  private async setDataAtLocation(value : any, relativeDataPath ?: stringOrArr, rawAccess ?: boolean) {
    const absoluteDataPath : Array<string> = this.getAbsoluteDataLocation(relativeDataPath, rawAccess);

    if (rawAccess && !absoluteDataPath.length) {
      throw new Error(`Data location cannot be null in case of raw set. Please specify some data location`);
    }

    const tableName  = absoluteDataPath[0];
    const topLevelData : any = await new Promise(resolve => {
      this._store.get(tableName, (item) => {
        resolve(item);
      });
    });
    

    set(topLevelData, absoluteDataPath, value);

    await new Promise(resolve => {
      const data = {
        [tableName] : topLevelData
      };
      this._store.set(data, () => {
        if (!rawAccess) {
          this._instanceData = {absoluteDataPath, topLevelData};
        }
        resolve(value);
      });
    });
  }

  private getAbsoluteDataLocation(keyPath ?: stringOrArr, rawAccess = false) {
    keyPath = keyPath || [];
    let tableName : stringOrArr = this._tableName; // when calling from base class prefix base class name

    if (isString(keyPath)) {
      keyPath = keyPath.split(/\[|\]|\./);
      keyPath = keyPath.map(keys => keys.trim());
      keyPath = keyPath.filter(key => key !== "");
    } 

    if (!rawAccess) {
      this.validateKeyPath(keyPath);
      // table to be suffixed post validation
      let entityId : string = this._id;

      if (entityId) {
        keyPath.unshift(entityId);
      }

      if (tableName) {
        keyPath.unshift(tableName);
      }
    }
  
    // console.log(`Evaluated Absolute key path is : `,keyPath);
    return keyPath;
  }

  /**
   * Only the columns present in sub classes should be allowed in top level. 
   * Lower level we can accept any nested key
   * @param keyPath {stringOrArr}
   */
  private validateKeyPath(keyPath : Array<string>) : boolean {
    let validKeyPath : boolean = true;

    if (keyPath.length) {
      const columnName : string = keyPath.shift();
      let tableKeys = Object.keys(this);
      tableKeys = tableKeys.filter(tableKey => isString(tableKey) || isNumber(tableKey));
      validKeyPath  = tableKeys.indexOf(columnName) > -1;

      if (!validKeyPath) {
        throw new Error(`${columnName} is not a valid column name. Valid column names for table ${this._tableName} are ${tableKeys}. Please enter a valid column name`);
      }
    }
    return validKeyPath;
  }

  private async updateTopLevelSchema () {
    let existingTables  = await this.getRaw("tables") || [];
    const uniqTables = uniq([...existingTables, this._tableName]);

    if (existingTables.length !== uniqTables.length) {
      await this.setRaw("tables", uniqTables);
      console.log(`New Table Added to Chrome Storage : `, this._tableName, `. All Tables : `, uniqTables);
    }
  }

  public logData() {
    const tableData : any = this.getRaw();
    console.log(tableData);
  }
}