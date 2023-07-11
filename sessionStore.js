/* Save and get */
class SessionStore {
  /**
   *
   * @param {import("mysql").Connection} db Mysql databse connection instance
   */

  constructor(db) {
    this.db = db;
  }

  /**
   * Get session information given userId
   * @param {*} userId 
   * @param {*} cb 
   */
  async findSession(userId, cb) {
    const sql = "SELECT * FROM session WHERE user_id = ? LIMIT 1;";
    this.db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error("Error getting user session: ", err);
        if(cb) cb(false);
        return;
      }

      if (results.length == 0) {
        console.log(`No user with such id:${userId} was found`);
        if(cb) cb(false)
        return;
      }
      // user found
      let session = { ...results[0] };
     if(cb) cb(session);
    });
  }

  /**
   * Save a user in sessions table, to track their online presence
   * @param {*} session 
   * @param {*} cb 
   */
  saveSession(session, cb) {
    const sql = "INSERT INTO session SET ?";
    this.db.query(sql, session, (err, results) => {
      if (err) {
        console.log("Unable to save session", err);
        cb(false);
        return;
      }

      if(cb) cb(results);
    });
  }

  /**
   * Update connction details of a user. Can be only one key
   * @param {*} userId 
   * @param {*} session 
   * @param {*} cb 
   */
  updateSession(userId, session, cb) {
    const sql = "UPDATE session SET ? WHERE user_id = ?";
    this.db.query(sql, [session, userId], (err, results) => {
      if (err) {
        console.log("Error ocurred updating session: ", err);
        cb(false);
        throw new err();
      }

      // update was successful
     if(cb) cb(results);

    });
  }

  /**
   * Get all users in the connection
   * @param {*} cb 
   * @returns {Map}
   */
  findAllSessions(cb) {
    const sql = "SELECT * FROM session";
    this.db.query(sql, (err, results) => {
      if (err) {
        console.log("Error getting all users in session: ", err);
        cb(false);
        return;
      }

      const usersMap = new Map();
      results.forEach((session) => {
        usersMap.set(session.id, { ...session });
      });

      cb(usersMap);
    });
  }

  /**
   * Get all registered users
   * @param {*} cb 
   * @returns {Map} 
   */
  findAllUsers(cb) {
    const sql = "SELECT users.u_id, users.username, users.email, session.connected, session.last_seen FROM users LEFT JOIN session ON users.u_id = session.user_id;";
    this.db.query(sql, (err, results) => {
      if (err) {
        console.log("Error getting all users: ", err);
        cb(false);
        return;
      }

      const usersMap = new Map();
      results.forEach((user) => {
        usersMap.set(user.u_id, { ...user });
      });

      cb(usersMap);
    });
  }
}

module.exports = SessionStore;
