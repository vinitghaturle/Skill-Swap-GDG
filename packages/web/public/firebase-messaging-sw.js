// Firebase Cloud Messaging Service Worker
// This runs in the background when the app is not focused

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase config - must match your app config
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const notificationTitle = payload.notification?.title || 'SkillSwap';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new notification',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: payload.data?.type || 'default',
        data: payload.data,
        requireInteraction: payload.data?.type === 'call_incoming',
        actions: getActionsForType(payload.data?.type),
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Get actions based on notification type
function getActionsForType(type) {
    switch (type) {
        case 'call_incoming':
            return [
                { action: 'answer', title: 'Answer' },
                { action: 'decline', title: 'Decline' }
            ];
        case 'session_request':
            return [
                { action: 'view', title: 'View Request' }
            ];
        default:
            return [];
    }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);
    event.notification.close();

    const data = event.notification.data || {};
    let url = '/';

    // Determine where to navigate based on notification type
    if (data.type === 'message' && data.conversationId) {
        url = `/chat/${data.conversationId}`;
    } else if (data.type === 'session_request' && data.sessionId) {
        url = `/sessions/${data.sessionId}`;
    } else if (data.type === 'call_incoming' && data.sessionId) {
        url = `/call/${data.sessionId}`;
    } else if (data.type === 'session_accepted' && data.sessionId) {
        url = `/sessions/${data.sessionId}`;
    }

    // Handle action buttons
    if (event.action === 'answer' && data.sessionId) {
        url = `/call/${data.sessionId}`;
    } else if (event.action === 'decline') {
        // Just close the notification
        return;
    }

    // Focus existing window or open new one
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Try to focus an existing window
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(url);
                    return;
                }
            }
            // Open a new window if no existing one
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
