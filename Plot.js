/**
 * Implementation of the land and its plots
 */
class Plot {
  constructor(db) {
    this.db = db;
    this.plots = this.createAdjacencyList();
    this.selectedPlots = new Set();
    this.users = new Map();
    this.getUserData();
  }

  /**
   * Create an adjacency list of the plots and their neighbors
   * @return {Map} A map of plot numbers and their adjacent plots
   */
  createAdjacencyList() {
    const adjacentPlots = new Map();
    adjacentPlots.set(1, [2, 23]);
    adjacentPlots.set(2, [1, 3]);
    adjacentPlots.set(3, [2, 4]);
    adjacentPlots.set(4, [3]);
    adjacentPlots.set(5, [6]);
    adjacentPlots.set(6, [5, 7]);
    adjacentPlots.set(7, [6, 8]);
    adjacentPlots.set(8, [7, 9]);
    adjacentPlots.set(9, [8, 10]);
    adjacentPlots.set(10, [9, 11]);
    adjacentPlots.set(11, [10, 12]);
    adjacentPlots.set(12, [11]);
    adjacentPlots.set(13, [14]);
    adjacentPlots.set(14, [13, 15]);
    adjacentPlots.set(15, [14, 16]);
    adjacentPlots.set(16, [15, 17]);
    adjacentPlots.set(17, [16, 18]);
    adjacentPlots.set(18, [17, 19]);
    adjacentPlots.set(19, [18, 20]);
    adjacentPlots.set(20, [19]);
    adjacentPlots.set(21, [22]);
    adjacentPlots.set(22, [21, 23]);
    adjacentPlots.set(23, [1, 22]);
    adjacentPlots.set(24, [27]);
    adjacentPlots.set(25, [26]);
    adjacentPlots.set(26, [25, 30]);
    adjacentPlots.set(27, [24, 28]);
    adjacentPlots.set(28, [27, 29]);
    adjacentPlots.set(29, [28]);
    adjacentPlots.set(30, [26]);
    return adjacentPlots;
  }

  /**
   * Check if two plots are adjacent
   * @param {int} plot1 Plot1
   * @param {int} plot2 Plot2
   * @return {bool} Whether plot1 and plot 2 are adjacent
   */
  //   isAdjacent(plot1, plot2) {
  //     return this.plots.get(plot1).includes(plot2);
  //   }

  /**
   * Remove a plot from the adjacency list
   * This can be after it has been selected by a buyer
   * @param {int} plot Plot number
   */
  removePlot(plot) {
    this.plots.get(plot).forEach((adjacentPlot) => {
      // remove this plot too in its neighbouring plots adj list
      let adjacentPlots = this.plots.get(adjacentPlot);
      this.plots.set(
        adjacentPlot,
        adjacentPlots.filter((p) => p != plot)
      );
    });
    // mark the plot that it doesnt have a neighbour
    this.plots.set(plot, []);
    // mark this plot as selected
    this.selectedPlots.add(plot);
  }

  /**
   * Check if a plot has neighboring(adjacent) plots
   * @return {bool} True or false depending on whether the plot has neighbouring plots
   */
  hasAdjacent(plot) {
    return this.plots.get(plot).length > 0;
  }

  /**
   * Print all plots which have adjacent plots
   * @return {Set} A set of plots that have adjacent plots
   */
  getAdjacentPlots() {
    let adjacentPlots = new Set();
    for (let key of this.plots.keys()) {
      if (this.plots.get(key).length > 0) {
        adjacentPlots.add(key);
      }
    }

    return adjacentPlots;
  }
  /**
   * Get selected plots
   */

  getSelectedPlots() {
    return this.selectedPlots;
  }

  /**
   * Restart the plot selection process
   */
  restartSelection() {
    this.plots = this.createAdjacencyList();
    this.selectedPlots.clear();
    this.restartDbSelections((err, res) => {
      if (err) throw err;
      this.getUserData();
    });
  }

  // get user data from mysql database
  getUserData() {
    const sql =
      "SELECT u_id AS userId, max_slots, remaining_slots FROM users WHERE true;";
    this.db.query(sql, (err, rows) => {
      rows.forEach((user) => {
        const userData = new Map();
        userData.set("maxSlots", user.max_slots);
        userData.set("remainingSlots", user.remaining_slots);
        this.users.set(user.userId, userData);
      });
    });
  }

  /**
   * Update database for restart process
   * @param cb Callback function to run after query is complete
   */
  restartDbSelections(cb) {
    // reset remaining slots
    const sql = "UPDATE users SET can_select=1, remaining_slots = max_slots WHERE true;";
    this.db.query(sql, (err, res) => {
      if (err) throw err;
      // discard previous selections
      this.db.query(
        "UPDATE user_selection SET active = 0 WHERE active=1;",
        cb()
      );
    });
  }
}

module.exports = { Plot };
