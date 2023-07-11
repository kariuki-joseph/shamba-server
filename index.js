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
const sessionStore = new SessionStore(db);

// socket authentication
io.use(function (socket, next) {
  const userId = socket.handshake.auth.userId;
  const email = socket.handshake.auth.email;
  const username = socket.handshake.auth.username;
  // ensure required params
  if (!userId) {
    console.log("Cannot join: Missing userId")
    return next(new Error("Missing userId"));
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
io.on("connection", socket => {

    console.log(`${socket.username } has joined`);
    // user has connected. Notify other users
    socket.broadcast.emit("user-connected", {
        userId: socket.userId, 
        username: socket.username,
        email: socket.email,
        connected: true
    });

    // send data about all users and their online status
    let allUsers = [];
    sessionStore.findAllUsers(users => {
        const values = users.values();
        let user;
        while((user = values.next().value) != undefined){

            allUsers.push({
                userId: user.u_id,
                username: user.username,
                email: user.email,
                connected: Boolean(user.connected),
                lastSeen: user.last_seen
            })
        };

         socket.emit("users", allUsers);
    });

   

    // broadcast selection results
    socket.on("selection-results", data => {
        socket.broadcast.emit("selection-results", data);
    });

    // notify of user left
    socket.on("disconnect", () => {
        socket.broadcast.emit("user-disconnected", {
          userId: socket.userId,
          username: socket.username
        });

        // update in database
        const now = new Date();

        sessionStore.updateSession(socket.userId, {
            connected: false, 
            last_seen: now
        });


    })


});




const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`Shamba nodejs server running on: http://localhost:${PORT}`)
);
