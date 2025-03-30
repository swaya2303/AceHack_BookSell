let currentChatId = null;
let senderId = null;

document.addEventListener("DOMContentLoaded", async () => {
    const sessionResponse = await fetch('/get-session');
    const sessionData = await sessionResponse.json();
    if (!sessionData.loggedIn) {
        window.location.href = '/login.html';
        return;
    }
    senderId = sessionData.userId;
    loadChatList();
    setupNotifications();

    // Handle back button for mobile
    document.querySelector('.back-btn').addEventListener('click', () => {
        document.querySelector('.chat-window').classList.remove('active');
        document.querySelector('.sidebar').classList.add('active');
    });
});

async function loadChatList() {
    try {
        const response = await fetch('/chat/list');
        const chatList = await response.json();

        const sidebar = document.getElementById('user-list');
        sidebar.innerHTML = '';

        chatList.forEach(chat => {
            const li = document.createElement('li');
            li.className = 'chat-item';
            li.dataset.chatId = chat.chatId;
            li.dataset.receiverId = chat.otherUserId;
            li.innerHTML = `
                <img src="default-avatar.png" alt="Avatar" class="chat-avatar">
                <div class="chat-info">
                    <div class="chat-name">${chat.otherUserName}</div>
                    <div class="chat-preview">${chat.lastMessage || 'No messages yet'}</div>
                </div>
                <div class="chat-time">${new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                ${chat.unreadCount > 0 ? `<span class="unread-count">${chat.unreadCount}</span>` : ''}
            `;
            li.addEventListener('click', () => selectChat(chat.chatId, chat.otherUserName, chat.otherUserId));
            sidebar.appendChild(li);
        });

        const urlParams = new URLSearchParams(window.location.search);
        const receiverId = urlParams.get('receiverId');
        if (receiverId) {
            const chat = chatList.find(c => c.otherUserId === receiverId);
            if (chat) selectChat(chat.chatId, chat.otherUserName, chat.otherUserId);
        }
    } catch (error) {
        console.error('Error loading chat list:', error);
    }
}

async function selectChat(chatId, otherUserName, receiverId) {
    currentChatId = chatId;
    document.getElementById('chat-header').querySelector('.chat-title').innerText = otherUserName;
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`.chat-item[data-chat-id="${chatId}"]`).classList.add('active');
    fetchMessages(chatId);

    // Show chat window on mobile
    document.querySelector('.chat-window').classList.add('active');
    document.querySelector('.sidebar').classList.remove('active');
}

async function fetchMessages(chatId) {
    if (!chatId) return;

    try {
        const response = await fetch(`/chat/messages?chatId=${chatId}`);
        const messages = await response.json();

        const chatBox = document.getElementById('chat-box');
        chatBox.innerHTML = messages.length === 0 ? '<p style="text-align: center; color: #888;">No messages yet.</p>' : '';

        messages.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `message ${msg.senderId === senderId ? 'sent' : 'received'}`;
            msgDiv.innerHTML = `
                ${msg.message}
                <div class="message-timestamp">${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            `;
            chatBox.appendChild(msgDiv);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
}

document.getElementById('send-btn').addEventListener('click', async () => {
    const message = document.getElementById('message-input').value.trim();
    if (!message || !currentChatId) return;

    try {
        const receiverId = document.querySelector(`.chat-item[data-chat-id="${currentChatId}"]`).dataset.receiverId;
        const response = await fetch('/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiverId, message })
        });

        if (response.ok) {
            document.getElementById('message-input').value = '';
            fetchMessages(currentChatId);
            loadChatList();
        } else {
            alert('Failed to send message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message');
    }
});

function setupNotifications() {
    const eventSource = new EventSource('/chat/notifications/stream');
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'newMessage') {
            if (data.chatId === currentChatId) {
                fetchMessages(currentChatId);
            }
            loadChatList();
            showNotification(`New message in chat`);
        }
    };
    eventSource.onerror = () => {
        console.error('SSE error, reconnecting...');
        eventSource.close();
        setTimeout(setupNotifications, 2000);
    };
}

function showNotification(message) {
    if (Notification.permission === 'granted') {
        new Notification('BookSell Chat', { body: message });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('BookSell Chat', { body: message });
            }
        });
    }
}