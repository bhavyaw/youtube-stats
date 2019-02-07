/**
 * To focus on it once I am done with the main chrome extension
 */

import isString = require("lodash/isString");
import isEmpty = require("lodash/isEmpty");
import isNil = require("lodash/isNil");
import isFunction = require("lodash/isFunction");

enum LogLevels {
  log = "log",
  error = "error",
  warn = "warn",
  trace = "trace",
  info = "info",
  debug = "debug"
}

 interface Logger {
   configure(logOptions, any),
   createCustomlog(),
   intercept(),
   listen(),
 }

type PropertyFunction<T> = (...any) => T;


 interface logOptions {
   timestamp ?: string | PropertyFunction<string>,  
   template ?: string | PropertyFunction<string> // options - string, timestamp, icon
   prettyObject ?: boolean
   color ?: string | PropertyFunction<string>
   icon ?: string | PropertyFunction<string>
   logToFile ?: string | PropertyFunction<string>
   interceptor ?(string, ...any)
 }

 class Logger implements Logger {
   private commonOpts : logOptions = {};
   private logLevelOpts : any = {
    log : {
      template : `{{string}}`,
      prettyObject : false,
    },
    error : {
      template : `{{icon}}{{string}}`,
      prettyObject : false,
      color : "red",
      icon : "cross",
    },
    warn : {
      template : `{{icon}}{{string}}`,
      prettyObject : false,
      color : "yellow",
      icon : "warn",
    },
    info : {
      template : `{{icon}}{{string}}`,
      prettyObject : false,
      color : "blue",
      icon : "info"
    },
    trace : {
      template : `{{icon}}{{string}}`,
      prettyObject : false,
    }
   };

   constructor() {}
   
   configure(commonOpts : logOptions, logLevelOpts) {
    this.commonOpts = Object.assign(this.commonOpts, this.commonOpts);

    for (const logLevel in logLevelOpts) {
      if (logLevelOpts.hasOwnProperty(logLevel) && LogLevels[logLevel] !== "") {
        const userDefinedOpts = logLevelOpts[logLevel];
        Object.assign(this.logLevelOpts[logLevel], userDefinedOpts);
      }
    }
   }


  // Log Level Implementation
  
  log(string, ...substitutions) {
    const logLevelOptions : logOptions = this.logLevelOpts[LogLevels.log];
    // const timestamp : string = this.generateTimestamp(logLevelOptions);

  }

  error(string, ...substitutions) {

  }

  warn(string, ...substitutions) {

  }

  trace(string, ...substitutions) {

  }

  debug(string, ...substitutions) {

  }


  // create custom logger
  createCustomlog() {

  }


  intercept() {

  }

  listen() {

  }

  // utility
  generateTimestamp(logLevelOpts : logOptions) {
    const timestamp = logLevelOpts["timestamp"];
    let timestampValue : string = "";

    if(logLevelOpts.timestamp) {
      if (isString(timestamp)) {
        
      } else if (isFunction(timestamp)) {
        timestampValue = timestamp();

        if (isEmpty(timestampValue) || isNil(timestampValue)) {
          throw new Error(`Please provide a valid timestamp function. One which returns the value of timestamp as a string. Returned value is : ${timestampValue}`);
        }
      } else {
        throw new Error("Please provide a valid timestamp value. Timestamp can either be a string or a Function");
      }
    }
  }


 }

 const logger = new Logger();
 export default logger;