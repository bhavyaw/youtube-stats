const path = require("path");
const webpackGlobEntries = require('webpack-glob-entries');
const originalEntriesHash = webpackGlobEntries('C:/Users/bhavy/Desktop/OSS-Projects/boilerplates/chrome-extension-react-typescript-boilerplate/src/**/*.{ts,tsx}');
const {
  pick,
  values
} = require("lodash");

const mainEntries = pick(originalEntriesHash, [
  'variableAccessScriptNew',
  'models',
  'activityControlsPage',
  'youtubeHistoryItemsPage',
  'YoutubeVideo'
]);

mainEntries["background"] = `C:/Users/bhavy/Desktop/OSS-Projects/boilerplates/chrome-extension-react-typescript-boilerplate/src/background/main.ts`;
mainEntries["popup"] = `C:/Users/bhavy/Desktop/OSS-Projects/boilerplates/chrome-extension-react-typescript-boilerplate/src/popup/popup.tsx`

let commonEntries = pick(originalEntriesHash, [
  'appConfig',
  'appConstants',
  'appGlobals'
]);

console.log("\n\nMain Entries : ", mainEntries, "\n\nCommon Entries : ", commonEntries, "\n\n");


module.exports = {
  mode: "development",
  devtool: "eval-source-map",
  entry: Object.assign(mainEntries, {
    common: values(commonEntries),
    vendor: ['object-validate', 'receptor', 'qs', 'axios', 'chrome-utils', 'lodash', 'react', 'react-dom'],
  }),
  output: {
    path: path.join(__dirname, "dist/js"),
    filename: "[name].js"
  },
  module: {
    rules: [{
        exclude: /node_modules/,
        test: /\.tsx?$/,
        use: "ts-loader"
      },
      {
        test: /\.css$/,
        use: [{
            loader: "style-loader" // Creates style nodes from JS strings
          },
          {
            loader: "css-loader" // Translates CSS into CommonJS
          }
        ]
      },
      {
        exclude: /node_modules/,
        test: /\.scss$/,
        use: [{
            loader: "style-loader" // Creates style nodes from JS strings
          },
          {
            loader: "css-loader" // Translates CSS into CommonJS
          },
          {
            loader: "sass-loader" // Compiles Sass to CSS
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    alias: {
      common: path.resolve(__dirname, "src/common"),
      contentScripts: path.resolve(__dirname, "src/contentScripts"),
      background: path.resolve(__dirname, "src/background"),
      models: path.resolve(__dirname, "src/models"),
      appConstants: path.resolve(__dirname, "src/appConstants"),
      config: path.resolve(__dirname, "src/appConfig"),
      globals: path.resolve(__dirname, "src/appGlobals"),
      appStrings: path.resolve(__dirname, "src/appStrings")
    }
  }
};