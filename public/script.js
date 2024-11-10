const socket = io();
let username = '';
let currentRecipient = '';
const privateMessages = {};
const unreadMessages = {};

const login = () => {
    username = document.getElementById('username').value.trim();
    if (username) {
        socket.emit('login', username);
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('chat-container').style.display = 'block';
    } else {
        alert('Please enter a username.');
    }
};

const sendMessage = (type) => {
    const input = document.getElementById(`${type}-input`);
    const message = input.value.trim();

    if (message) {
        if (type === 'public') {
            socket.emit('chat message', { username, message });
        } else if (type === 'private') {
            if (currentRecipient) {
                socket.emit('private message', { message, recipient: currentRecipient });
                displayPrivateMessage({ message, sender: username }, currentRecipient, true);
            } else {
                alert('Please select a user to chat with privately.');
            }
        }
        input.value = '';
    }
};

const sendFile = (type) => {
    const fileInput = document.getElementById(`${type}-file`);
    const file = fileInput.files[0];

    if (file) {
        // Temporary check to block non-image files
        if (!file.type.startsWith('image/')) {
            alert('Only image files are allowed.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const message = {
                username,
                file: {
                    name: file.name,
                    type: file.type,
                    data: reader.result
                }
            };
            if (type === 'public') {
                socket.emit('file message', message);
            } else if (type === 'private') {
                if (currentRecipient) {
                    socket.emit('private file message', { ...message, recipient: currentRecipient });
                    displayPrivateMessage({ ...message, sender: username }, currentRecipient, true);
                } else {
                    alert('Please select a user to chat with privately.');
                }
            }
        };
        reader.readAsDataURL(file);
    }
};

const switchChat = () => {
    currentRecipient = document.getElementById('user-select').value;
    const messagesContainer = document.getElementById('private-messages');
    messagesContainer.innerHTML = '';
    if (privateMessages[currentRecipient]) {
        privateMessages[currentRecipient].forEach(msg => {
            displayPrivateMessage(msg, currentRecipient, false);
        });
    }
    if (unreadMessages[currentRecipient]) {
        delete unreadMessages[currentRecipient];
        updateNotification();
    }
};

const displayPrivateMessage = (msg, recipient, addToStorage = true) => {
    if (addToStorage) {
        if (!privateMessages[recipient]) {
            privateMessages[recipient] = [];
        }
        if (!privateMessages[recipient].some(m => m.message === msg.message && m.sender === msg.sender)) {
            privateMessages[recipient].push(msg);
        }
    }

    if (recipient === currentRecipient || msg.sender === username) {
        const messages = document.getElementById('private-messages');
        const messageElement = document.createElement('div');
        if (msg.file) {
            if (msg.file.type.startsWith('image/')) {
                messageElement.innerHTML = `From ${msg.sender}: <img src="${msg.file.data}" alt="${msg.file.name}" style="max-width: 100%; height: auto;">`;
            } else if (msg.file.type.startsWith('video/')) {
                messageElement.innerHTML = `From ${msg.sender}: <video controls style="max-width: 100%; height: auto;"><source src="${msg.file.data}" type="${msg.file.type}"></video>`;
            } else {
                messageElement.innerHTML = `From ${msg.sender}: <a href="${msg.file.data}" download="${msg.file.name}">${msg.file.name}</a>`;
            }
        } else {
            messageElement.textContent = `From ${msg.sender}: ${msg.message}`;
        }
        messages.appendChild(messageElement);
        messages.scrollTop = messages.scrollHeight;
    } else {
        if (!unreadMessages[recipient]) {
            unreadMessages[recipient] = [];
        }
        unreadMessages[recipient].push(msg);
        updateNotification();
    }
};

const updateNotification = () => {
    const notification = document.getElementById('notification');
    const unreadUsers = Object.keys(unreadMessages);
    if (unreadUsers.length > 0) {
        notification.style.display = 'block';
        notification.textContent = `New message from: ${unreadUsers.join(', ')}`;
    } else {
        notification.style.display = 'none';
    }
};

socket.on('chat message', (msg) => {
    const messages = document.getElementById('public-messages');
    const messageElement = document.createElement('div');
    messageElement.textContent = `${msg.username}: ${msg.message}`;
    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight;
});

socket.on('file message', (msg) => {
    const messages = document.getElementById('public-messages');
    const messageElement = document.createElement('div');
    if (msg.file.type.startsWith('image/')) {
        messageElement.innerHTML = `${msg.username}: <img src="${msg.file.data}" alt="${msg.file.name}" style="max-width: 100%; height: auto;">`;
    } else if (msg.file.type.startsWith('video/')) {
        messageElement.innerHTML = `${msg.username}: <video controls style="max-width: 100%; height: auto;"><source src="${msg.file.data}" type="${msg.file.type}"></video>`;
    } else {
        messageElement.innerHTML = `${msg.username}: <a href="${msg.file.data}" download="${msg.file.name}">${msg.file.name}</a>`;
    }
    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight;
});

socket.on('private message', (msg) => {
    displayPrivateMessage(msg, msg.sender);
});

socket.on('private file message', (msg) => {
    displayPrivateMessage(msg, msg.sender);
});

socket.on('user list', (users) => {
    const userSelect = document.getElementById('user-select');
    userSelect.innerHTML = '<option value="">Select a user</option>';
    users.forEach(user => {
        if (user !== username) {
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            userSelect.appendChild(option);
        }
    });
});

socket.emit('request user list');