/* Save and get */
class SessionStore {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Get session information given userId
   * @param {*} userId
   * @param {*} cb
   */
  async findSession(userId, cb) {
    const sql = "SELECT * FROM session WHERE user_id = ? LIMIT 1;";
    const connection = await this.pool.getConnection();
    try {
      const [rows, fields] = await connection.execute(sql, [userId]);
      if (rows.length == 0) {
        console.log("No user with this user_id is registered");
        if (cb) cb(false);
        return;
      }
      // user found
      let session = { ...rows[0] };
      if (cb) cb(session);
    } catch (err) {
      console.log(err);
    } finally{
      connection.release();
    }
  }

  /**
   * Save a user in sessions table, to track their online presence
   * @param {*} session
   * @param {*} cb
   */
  async saveSession(session, cb) {
    const sql = "INSERT INTO session SET ?";
    const connection = await this.pool.getConnection();
    try {
      const [rows, fields] = await connection.execute(sql, [session]);
      if (cb) cb(rows);
    } catch (err) {
      console.log("Save session error: " + err);
    } finally {
      connection.release();
    }
  }

  /**
   * Update connction details of a user. Can be only one key
   * @param {*} userId
   * @param {*} session
   * @param {*} cb
   */
  async updateSession(userId, session, cb) {
    const keys = Object.keys(session);
    const values = Object.values(session);
    const setValues = keys.map((key) => `${key} = ?`).join(", ")
    const sql = `UPDATE session SET ${setValues} WHERE user_id = ?`;
    const connection = await this.pool.getConnection();
    try {
      const [rows, fields] = await connection.execute(sql, [...values, userId]);
      if (cb) cb(rows);
      connection.release();
    } catch (err) {
      console.log("Update session error: " + err);
    } finally {
      connection.release();
    }
  }

  /**
   * Get all users in the connection
   * @param {*} cb
   * @returns {Map}
   */
  async findAllSessions(cb) {
    const sql = "SELECT * FROM session";
    const connection = await this.pool.getConnection();
    try {
      const [rows, fields] = await connection.execute(sql);
      const usersMap = new Map();
      rows.forEach((session) => {
        usersMap.set(session.id, { ...session });
      });

      cb(usersMap);
    } catch (err) {
      console.log("Error getting all users in session: ", err);
      cb(false);
      return;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all registered users
   * @param {*} cb
   * @returns {Map}
   */
  async findAllUsers(cb) {
    const sql =
      "SELECT users.u_id, users.username, users.email, session.connected, session.last_seen FROM users LEFT JOIN session ON users.u_id = session.user_id;";
      const connection = await this.pool.getConnection();
    try {
      const [rows, fields] = await connection.execute(sql);
      const usersMap = new Map();
      rows.forEach((user) => {
        usersMap.set(user.u_id, { ...user });
      });

      cb(usersMap);
    } catch (err) {
      console.log("Error getting all users: ", err);
      cb(false);
      return;
    } finally {
      connection.release();
    }
  }
}

module.exports = SessionStore;
