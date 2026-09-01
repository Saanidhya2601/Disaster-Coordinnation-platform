// client/src/socket.js
import { io } from 'socket.io-client';

// Connect to the backend server running on port 5000
const socket = io('http://localhost:5000', {
  autoConnect: true,
});

export default socket;