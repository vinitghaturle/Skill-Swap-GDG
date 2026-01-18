// Firebase configuration
// Copy .env.template to .env.local and fill in your Firebase credentials

import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import type { Messaging } from "firebase/messaging";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// VAPID key for web push (get from Firebase Console → Project Settings → Cloud Messaging)
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with persistence
export const auth = getAuth(app);

// Set persistence to LOCAL (survives page reloads and browser restarts)
setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Failed to set auth persistence:', error);
});

// Firebase Messaging (lazy initialized)
let messaging: Messaging | null = null;

/**
 * Get Firebase Messaging instance (only if supported)
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
    if (messaging) return messaging;

    const supported = await isSupported();
    if (!supported) {
        console.warn('Firebase Messaging is not supported in this browser');
        return null;
    }

    messaging = getMessaging(app);
    return messaging;
}

/**
 * Request FCM token for push notifications
 * Returns null if notifications are not supported or permission denied
 */
export async function requestFCMToken(): Promise<string | null> {
    try {
        if (!VAPID_KEY) {
            console.error('[FCM] VITE_FIREBASE_VAPID_KEY is not set in .env.local. Please add it and restart the dev server.');
            return null;
        }

        const messagingInstance = await getMessagingInstance();
        if (!messagingInstance) return null;

        // Register service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
        console.log('[FCM] Service worker registered and ready');

        // Get token
        const token = await getToken(messagingInstance, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (token) {
            console.log('[FCM] Token received:', token.substring(0, 20) + '...');
            return token;
        } else {
            console.log('[FCM] No token received - permission may not be granted');
            return null;
        }
    } catch (error) {
        console.error('[FCM] Error getting token:', error);
        return null;
    }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
    getMessagingInstance().then((messagingInstance) => {
        if (!messagingInstance) return;
        onMessage(messagingInstance, callback);
    });

    // Return cleanup function (no-op for now as onMessage doesn't return unsubscribe)
    return null;
}
