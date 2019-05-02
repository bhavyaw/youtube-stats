export const APP_MESSAGES = {
  alreadyRefreshing: `Refresh Cycle already running`,
  statsFieldDisplayNames: {
    formattedDate: 'Date',
    totalCount: 'Total Count',
    totalWatchedDuration: 'Duration',
    dailyAverage: 'Daily Average',
    totalActiveDays: 'Active Days',
    formattedDuration: 'Duration',
    formattedDailyAverage: 'Daily Average'
  },
  ERROR_MESSAGES: {
    noUserIdInExtraction:
      'No user id was found while trying to extract user id from variable access script',
    dataFetchingProcessChanged: 'Data fetching process changed by google'
  }
};

Object.freeze(APP_MESSAGES);
