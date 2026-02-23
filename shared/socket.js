let io;

module.exports = {
  init: (socketInstance) => {
    io = socketInstance;
  },

  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  }
};
