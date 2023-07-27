const http = require("node:http");
const express = require("express");
const app = express();
const mysql = require("mysql");

const server = http.createServer(app);
const cors = require("cors");
app.use(cors());

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

// set up db connection
const DB_HOST = "localhost";
const DB_USER = "root";
const DB_PASSWORD = "";
const DB_NAME = "landsale_db";

const db = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
});

db.connect((err, res) => {
  if (err) {
    console.log("Unable to connect to database: ", err);
  }
});

// session store instance
const SessionStore = require("./sessionStore");
const { Plot } = require("./Plot");
const sessionStore = new SessionStore(db);
const plot = new Plot(db);

// socket authentication
io.use(function (socket, next) {
  const userId = socket.handshake.auth.userId;
  const email = socket.handshake.auth.email;
  const username = socket.handshake.auth.username;
  // ensure required params
  if (!userId) {
    console.log("Cannot join: Missing userId");
    return next(new Error("Missing userId"));
  }

  // check if it's admin login
  if (userId == "admin") {
    socket.userId = "admin";
    socket.username = "Admin";
    socket.email = "admin@gmail.com";
    return next();
  }

  sessionStore.findSession(userId, (user) => {
    // user not in session table
    if (!user) {
      // user not saved in session. Look in all users
      sessionStore.findAllUsers((users) => {
        if (!users || !users.get(userId)) {
          // user not in the system
          console.log("No user with this user_id is registered");
          return next(new Error("Invalid userId"));
        }

        let user = users.get(userId);
        const data = {
          user_id: user.u_id,
          username: user.username,
          connected: true,
        };
        // user found. Add to session table
        sessionStore.saveSession(data, null);
        // attach details to socket
        socket.userId = user.u_id;
        socket.username = user.username;
        socket.email = user.email;

        return next();
      });

      return;
    }

    // user found in session store
    // update online status
    sessionStore.updateSession(userId, {
      connected: true,
    });

    // Attach socket with user data
    socket.userId = user.user_id;
    socket.username = user.username;
    socket.email = user.email;

    return next();
  });
});

// fired on connection
io.on("connection", (socket) => {
  console.log(`New User join: ${socket.username}`);
  // user has connected. Notify other users
  socket.broadcast.emit("user-connected", {
    userId: socket.userId,
    username: socket.username,
    email: socket.email,
    connected: true,
  });

  // send data about all users and their online status
  let allUsers = [];
  sessionStore.findAllUsers((users) => {
    const values = users.values();
    let user;
    while ((user = values.next().value) != undefined) {
      allUsers.push({
        userId: user.u_id,
        username: user.username,
        email: user.email,
        connected: Boolean(user.connected),
        lastSeen: user.last_seen,
      });
    }

    // if admin is logged in, send him as a user too
    const connectedSockets = io.sockets.sockets;
    let isAdminConnected = false;
    connectedSockets.forEach((socket) => {
      if (socket.userId == "admin") {
        isAdminConnected = true;
        return;
      }
    });

    allUsers.push({
      userId: "admin",
      username: "Admin",
      email: "admi@mail.com",
      connected: isAdminConnected,
      last_seen: "",
    });

    socket.emit("users", allUsers);
  });

  // send adjacent plots to this client
  socket.emit("plots", {
    adjacentPlots: [...plot.getAdjacentPlots()],
    selectedPlots: [...plot.getSelectedPlots()],
  });

  // broadcast selection results
  socket.on("selection-results", (data) => {
    // update plot selection
    const {number, userId} = data;

    let systemSelectedPlots = [];
    // check if user can make multiple selections
    let userData = plot.users.get(userId);
    if (userData != undefined || userData != null) {
      let remainingSlots = userData.remainingSlots;
      // user can select more plots
      if (remainingSlots != 0) {
        // check if selected plot has adjacent plot
        if (plot.hasAdjacent(data.number)) {
          // plot has adjacent plots. Select them for user
          const adjacentPlots = plot.plots.get(data.number);
          systemSelectedPlots = adjacentPlots.slice(0, remainingSlots);
        } else {
          console.log("plot has no adjacent plots");
        }
      } else {
        console.log("User has no remaining slots");
      }
    }

    // remove selected plot as well as system selected plots
    plot.removePlot(number);
    systemSelectedPlots.map(p => plot.removePlot(p));

    // notify everyone of selection results
    io.emit("selection-results", {
      ...data,
      numbers: [number, ...systemSelectedPlots],
    });

    // send adjacent plots updates to all connected clients
    io.emit("plots", {
      adjacentPlots: [...plot.getAdjacentPlots()],
      selectedPlots: [...plot.getSelectedPlots()],
    });
  });

  // restart plots selection
  socket.on("restart-plot-selection", () => {
    plot.restartSelection();
    io.emit("plots", {
      adjacentPlots: [...plot.getAdjacentPlots()],
      selectedPlots: [],
    });
    socket.emit("plot-selection-restarted");
  });

  // notify of user left
  socket.on("disconnect", () => {
    socket.broadcast.emit("user-disconnected", {
      userId: socket.userId,
      username: socket.username,
    });

    // update in database
    const now = new Date();

    // don't update database for admin
    if (socket.userId == "admin") return;

    sessionStore.updateSession(socket.userId, {
      connected: false,
      last_seen: now,
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`Shamba nodejs server running on: http://localhost:${PORT}`)
);
