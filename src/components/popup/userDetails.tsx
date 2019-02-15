import * as React from 'react';

export interface Props {
  selectedUserId: string
  users: Array<any>,
  onUserChange(string)
}

export interface State {

}

class UserDetails extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  handleUserChange = (e) => {
    const newUserId: string = e.target.value;
    console.log(`Inside handle user change : `, e, newUserId);

    if (newUserId !== this.props.selectedUserId) {
      console.log("user changed : ", newUserId);
      this.props.onUserChange(newUserId);
    }
  }

  render() {
    const { selectedUserId, users } = this.props;
    return (
      <section>
        User :
        <select
          value={selectedUserId}
          onChange={this.handleUserChange}
        >
          {
            users.map(({ userId, userName }, index) => (
              <option value={userId}
                key={userId}
              >
                {userName}
              </option>
            ))
          }
        </select>
      </section>
    );
  }
}

export default UserDetails;