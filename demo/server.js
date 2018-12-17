/**
 * Sets up an Express server to serve the demo files
 */

const config = {
  port: (process.env.PORT || 8080)
};

const express = require("express");
const http = require("http");
const path = require("path");

const app = express();

// Logging middleware
// ------------------
const logger = require("morgan");
app.use(logger("dev"));

// Demo files
// ----------
app.use(express.static(__dirname));
app.use("/dist", express.static(path.join(__dirname, "..", "dist")));

// Set up HTTP interface
// ---------------------
app.set("port", config.port);

const server = http.createServer(app);
server.listen(config.port);
server.on("error", onError);
server.on("listening", onListening);

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Functions

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof config.port === "string"
    ? "Pipe " + config.port
    : "Port " + config.port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  const addr = server.address();
  const bind = typeof addr === "string"
    ? "pipe " + addr
    : "port " + addr.port;
  console.log("Listening on " + bind);
}