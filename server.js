const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const users = {};

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('login', (username) => {
        users[socket.id] = username;
        io.emit('user list', Object.values(users));
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        delete users[socket.id];
        io.emit('user list', Object.values(users));
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    socket.on('file message', (msg) => {
        io.emit('file message', msg);
    });

    socket.on('private message', ({ message, recipient }) => {
        const recipientSocketId = Object.keys(users).find(key => users[key] === recipient);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('private message', { message, sender: users[socket.id] });
        } else {
            socket.emit('private message', { message, sender: users[socket.id] }); // Emit back to sender if recipient is not found
        }
    });

    socket.on('private file message', ({ file, recipient }) => {
        const recipientSocketId = Object.keys(users).find(key => users[key] === recipient);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('private file message', { file, sender: users[socket.id] });
        } else {
            socket.emit('private file message', { file, sender: users[socket.id] }); // Emit back to sender if recipient is not found
        }
    });

    socket.on('request user list', () => {
        socket.emit('user list', Object.values(users));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});