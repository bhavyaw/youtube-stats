import * as React from 'react';
import DatePicker from 'react-datepicker';
import { StatsIntervalOptions, StatsDisplayTypes } from 'interfaces';

export default function StatsFinderControls({
  selectedDate,
  fetchingStatsInProgress,
  selectedStatsInterval,
  selectedStatDisplayType,
  onIntervalStatsChange,
  handleStatDisplayTypeChange,
  statsIntervalOptions,
  statsDisplayTypes,
  onStatsDateChange,
  parentStyles
}: {
  selectedDate: Date;
  fetchingStatsInProgress: boolean;
  selectedStatsInterval: StatsIntervalOptions;
  selectedStatDisplayType: StatsDisplayTypes;
  onIntervalStatsChange(e: any): void;
  handleStatDisplayTypeChange(e: any): void;
  parentStyles: any;
  statsIntervalOptions: any[];
  statsDisplayTypes: any[];
  onStatsDateChange(newSelectedDate: Date): void;
}) {
  return (
    <React.Fragment>
      <section className="row my-2 mx-0 justify-content-center">
        <section className="col-3 px-0" title="Select Date">
          <DatePicker
            selected={selectedDate}
            onChange={onStatsDateChange}
            disabled={fetchingStatsInProgress}
            className="w-100 form-control-sm px-1"
          />
        </section>
        <div className="col-4 px-1">
          <select
            title="Select Stats Interval"
            className="w-100 form-control-sm px-1"
            value={selectedStatsInterval}
            onChange={onIntervalStatsChange}
            disabled={fetchingStatsInProgress}
          >
            {statsIntervalOptions.map(({ name, value }) => (
              <option value={value} key={`key_${value}`}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-5 px-0">
          <select
            title="Select Stats Display Type"
            className="w-100 form-control-sm px-1"
            value={selectedStatDisplayType}
            onChange={handleStatDisplayTypeChange}
            disabled={fetchingStatsInProgress}
          >
            {statsDisplayTypes.map(({ name, value }) => (
              <option value={value} key={`key_${value}`}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </section>
    </React.Fragment>
  );
}
