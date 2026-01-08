import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_SOCKET_URL);

export const socketService = {
  connect: () => socket.connect(),
  disconnect: () => socket.disconnect(),
  on: (event, callback) => socket.on(event, callback),
  emit: (event, data) => socket.emit(event, data),
};

export default socket;