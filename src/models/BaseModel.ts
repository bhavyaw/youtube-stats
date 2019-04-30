import get = require('lodash/get');
import set = require('lodash/set');
import isArray = require('lodash/isArray');
import isString = require('lodash/isString');
import isObject = require('lodash/isObject');
import toLower = require('lodash/toLower');
import { stringOrArr, chromeStorage, storeType, numberOrString } from 'interfaces';
import isEmpty = require('lodash/isEmpty');
import isNumber = require('lodash/isNumber');
import pickBy = require('lodash/pickBy');
import isFunction = require('lodash/isFunction');
import uniq = require('lodash/uniq');
import isUndefined = require('lodash/isUndefined');

export default abstract class BaseModel {
  private _storageApi: chromeStorage = chrome.storage.local;
  private _idGetSetProp: string = null;
  private _storeNameGetSetProp: string;
  // private _instanceDataGetSetProp: any;

  public static storagePrefix: string = '__CHROME_ORM__';
  public static metaDataStore: string = 'meta_info';

  constructor(id?: numberOrString, storeType?: storeType) {
    if (storeType) {
      this._storageApi = chrome.storage[storeType]; // default store
    }

    this._id = id as string;

    if (this.constructor.name !== BaseModel.name) {
      const storeName: string = this.constructor.name;
      this._storeName = toLower(storeName);
      this.updateTopLevelSchema(storeName);
    }
  }

  private set _id(id: string) {
    if (!isEmpty(id)) {
      if (!isString(id) && !isNumber(id)) {
        throw new Error(`Id can be either string or a number. Please enter a valid id`);
      }

      if (isString(id)) {
        id = id.replace(/\./g, '_'); // replacing underscores with
      }

      if (isNumber(id)) {
        id = String(id);
      }
    }
    this._idGetSetProp = id;
  }

  private get _id(): string {
    return this._idGetSetProp;
  }

  private set _storeName(storeName: string) {
    this._storeNameGetSetProp = storeName;
  }

  private get _storeName() {
    return this._storeNameGetSetProp;
  }

  // private set _instanceData({ store, absoluteDataPath }) {
  //   let instanceDataPath: string;

  //   if (this._id) {
  //     instanceDataPath = absoluteDataPath.slice(0, 2);
  //   } else {
  //     instanceDataPath = absoluteDataPath.slide(0, 1);
  //   }

  //   const instanceData: any = get(store, instanceDataPath);

  //   this._instanceDataGetSetProp = instanceData;
  // }

  // private get _instanceData() {
  //   return this._instanceDataGetSetProp;
  // }

  public async get(dataLocation?: stringOrArr, getRaw?: boolean): Promise<any> {
    const absoluteSavePath: string[] = this.getAbsoluteDataLocation(dataLocation, getRaw);
    const topLevelDataLocation: string = absoluteSavePath[0];
    const topLevelData: any = await new Promise((resolve) => {
      this._storageApi.get(topLevelDataLocation, (item = null) => {
        resolve(item);
      });
    });

    let getResult: any = get(topLevelData, absoluteSavePath);

    // Store.get() case -> Return an object if no data found case
    if (!dataLocation && isUndefined(getResult)) {
      getResult = {};
    }
    // console.info(
    //   'BaseModel.js : getResult() : ',
    //   dataLocation,
    //   absoluteSavePath,
    //   topLevelData,
    //   getResult,
    //   getRaw
    // );
    return getResult;
  }

  // private getDataFromInstance(dataLocation): any | boolean {
  //   if (!isEmpty(this._storeName)) {
  //     const storeData: any = get(this._instanceData, dataLocation);
  //     return !isEmpty(storeData) ? storeData : false;
  //   }
  // }

  public async save(dataOrLocation, value?, rawAccess?: boolean): Promise<any> {
    if (isString(dataOrLocation) || isArray(dataOrLocation)) {
      return this.saveDataAtLocation(value, dataOrLocation, rawAccess);
    } else if (isObject(dataOrLocation)) {
      return this.saveDataAtLocation(dataOrLocation, '', rawAccess);
    }
  }

  public async getTopLevelSchema() {
    return this.get('stores');
  }

  private async setRaw(dataOrLocation, value): Promise<any> {
    return await this.save(dataOrLocation, value, true);
  }

  private async getRaw(dataLocation?: stringOrArr) {
    const rawCallResult: any = await this.get(dataLocation, true);
    return rawCallResult;
  }

  protected async saveDefaults() {
    const metaStoragePath: string[] = this.getMetaDataPath();
    const storeMetaData: any = (await this.getRaw(metaStoragePath)) || {};
    const areDefaultsSaved: boolean = storeMetaData.defaultsSaved;

    if (!areDefaultsSaved) {
      const defaults = pickBy(this, (value, key) => {
        if (!isFunction(value) && !key.startsWith('_')) {
          return true;
        }
      });
      console.log(`Setting defaults for store ${this._storeName} : `, defaults);
      if (!isEmpty(defaults)) {
        this.saveDataAtLocation(defaults, undefined, undefined, true);
      }
    } else {
      console.log(`saveDefaults() : Defaults Already Saved!!`, storeMetaData, metaStoragePath);
    }
  }

  private async saveDataAtLocation(
    value: any,
    relativeDataPath?: stringOrArr,
    rawAccess?: boolean,
    defaults = false
  ) {
    const absoluteDataPath: string[] = this.getAbsoluteDataLocation(relativeDataPath, rawAccess);

    if (rawAccess && !absoluteDataPath.length) {
      throw new Error(
        `Data location cannot be null in case of raw set. Please specify some data location`
      );
    }

    const metaStoragePath: string[] = this.getMetaDataPath();
    const storeName: string = absoluteDataPath[0];
    const storeData: any = await this.getRaw(storeName);
    const store: any = {
      [storeName]: storeData
    };

    // if (!relativeDataPath) {
    //   const dataAtPath = get(store, absoluteDataPath) || {};
    //   if (!isEmpty(dataAtPath) && isObject(value) && !isArray(value)) {
    //     value = Object.assign(dataAtPath, value);
    //   }
    // }

    set(store, absoluteDataPath, value);

    if (defaults) {
      const metaStoreName: string = metaStoragePath[0];
      const metaStoreData: any = await this.getRaw(metaStoreName);
      const metaStore: any = {
        [metaStoreName]: metaStoreData
      };
      const metaData: any = {
        defaultsSaved: true
      };
      set(metaStore, metaStoragePath, metaData);
      Object.assign(store, metaStore);
    }

    await new Promise((resolve) => {
      this._storageApi.set(store, () => {
        // if (!rawAccess) {
        //   this._instanceData = {
        //     store,
        //     absoluteDataPath
        //   };
        // }
        // console.log(
        //   'Saved data in chrome storage. \n Path : ',
        //   absoluteDataPath,
        //   '\tValue : ',
        //   store
        // );
        // this._storageApi.set({});
        resolve(value);
      });
    });
  }

  private getAbsoluteDataLocation(keyPath?: stringOrArr, rawAccess = false) {
    keyPath = keyPath || [];
    const storeName: stringOrArr = this._storeName; // when calling from base class prefix base class name
    const storeNameToFetchData: string = `${BaseModel.storagePrefix}-${storeName}`;

    if (isString(keyPath)) {
      keyPath = keyPath.split(/\[|\]|\./);
      keyPath = keyPath.map((keys) => keys.trim());
      keyPath = keyPath.filter((key) => key !== '');
    }

    if (!rawAccess) {
      this.validateKeyPath(keyPath);
      // store to be suffixed post validation
      const entityId: string = this._id;

      if (entityId) {
        keyPath.unshift(entityId);
      }

      if (storeName) {
        keyPath.unshift(storeNameToFetchData);
      }
    }

    // console.log(`Evaluated Absolute key path is : `,keyPath);
    return keyPath;
  }

  private getMetaDataPath(): string[] {
    const storeName: string = this._storeName;
    const storagePrefix: string = BaseModel.storagePrefix;
    const metaStoreName: string = BaseModel.metaDataStore;
    const storeNameForSaving: string = `${storagePrefix}-${metaStoreName}`;

    const metaDataPath: string[] = [storeNameForSaving, storeName];
    return metaDataPath;
  }

  /**
   * Only the columns present in sub classes should be allowed in top level.
   * Lower level we can accept any nested key
   * @param keyPath {stringOrArr}
   */
  private validateKeyPath(keyPath: string[]): boolean {
    let validKeyPath: boolean = true;

    if (keyPath.length) {
      const columnName: string = keyPath[0];
      let storeKeys = Object.keys(this);
      storeKeys = storeKeys.filter((storeKey) => isString(storeKey) || isNumber(storeKey));
      validKeyPath = storeKeys.indexOf(columnName) > -1;

      if (!validKeyPath) {
        throw new Error(
          `${columnName} is not a valid column name. Valid column names for store ${
            this._storeName
          } are ${storeKeys}. Please enter a valid column name`
        );
      }
    }
    return validKeyPath;
  }

  private async updateTopLevelSchema(storeName: string) {
    const existingStores = (await this.getRaw(`${BaseModel.storagePrefix}-stores`)) || [];
    // console.log(`updateTopLevelSchema() : existing stores are : `, existingStores);
    const uniqStores = uniq([...existingStores, storeName]);

    if (existingStores.length !== uniqStores.length) {
      await this.setRaw(`${BaseModel.storagePrefix}-stores`, uniqStores);
      console.log(
        `New Store Added to Chrome Storage : `,
        this._storeName,
        `. All Stores : `,
        uniqStores
      );
    }
  }

  private getNewEmptyStore(storeName: string) {
    const newStore: any = {
      [storeName]: {}
    };

    return newStore;
  }
}
