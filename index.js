const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
require("dotenv").config()
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    credentials: true,
  },
});

app.use(express.static("dist"));
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const userSocketMap = {};

const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  ); // it will return map return all clients in the room
};
io.on("connection", (socket) => {
  // console.log("Socket connected", socket.id);
  socket.on("join", ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    // console.log(clients);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit("joined", {
        clients,
        username,
        socketId,
      });
    });
  });

  socket.on("codechange", ({ roomId, code }) => {
    socket.in(roomId).emit("codechange", { code });
  });
  socket.on("synccode", ({ socketId, code }) => {
    io.to(socketId).emit("codechange", { code });
  });
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit("disconnected", {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
