import * as React from 'react';

export interface Props {
  selectedUserId: string;
  users: Array<any>;
  onUserChange(string);
  onClickRefresh(e: any): void;
  lastRunDate: string;
}

export interface State {}

class UserDetails extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  handleUserChange = e => {
    const newUserId: string = e.target.value;
    console.log(`Inside handle user change : `, e, newUserId);

    if (newUserId !== this.props.selectedUserId) {
      console.log('user changed : ', newUserId);
      this.props.onUserChange(newUserId);
    }
  };

  render() {
    const { selectedUserId, users, lastRunDate, onClickRefresh } = this.props;

    return (
      <React.Fragment>
        <section className="card shadow-sm">
          <div className="card-header py-0 px-2 cursor-pointer">Active User</div>
          <div className="card-body py-2 px-2">
            <section className="input-group input-group-sm mb-1">
              <div className="input-group-prepend">
                <label className="input-group-text" htmlFor="active-user">
                  User
                </label>
              </div>
              <select
                id="active-user"
                className="custom-select"
                value={selectedUserId}
                onChange={this.handleUserChange}
              >
                {users.map(({ userId, userName }, index) => (
                  <option value={userId} key={userId}>
                    {userName}
                  </option>
                ))}
              </select>
            </section>

            <section className="input-group input-group-sm">
              <div className="input-group-prepend">
                <label className="input-group-text">Last Update</label>
              </div>
              <input
                type="text"
                aria-label="First name"
                className="form-control bg-light cursor-na"
                value={lastRunDate}
                readOnly={true}
              />
              <div className="input-group-append">
                <button type="button" className="btn btn-primary" onClick={onClickRefresh}>
                  Refresh
                </button>
              </div>
            </section>
          </div>
        </section>
      </React.Fragment>
    );
  }
}

export default UserDetails;
