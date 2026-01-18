"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { GoogleAuth } from "google-auth-library";

/**
 * Send a push notification to specific tokens using FCM HTTP v1 API
 * This is an action because it performs an external network request
 */
export const sendPushNotification = internalAction({
    args: {
        tokens: v.array(v.string()),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        if (args.tokens.length === 0) return;

        // Fetch credentials from environment variables
        const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
        const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
        const PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;

        if (!PROJECT_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
            console.warn("FCM v1 credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) not set in Convex environment variables. Push notification skipped.");
            return;
        }

        try {
            // Initialize Google Auth for token acquisition
            const auth = new GoogleAuth({
                credentials: {
                    client_email: CLIENT_EMAIL,
                    // Handle escaped newlines if the key was pasted as a string
                    private_key: PRIVATE_KEY.replace(/\\n/g, '\n'),
                },
                scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
            });

            const client = await auth.getClient();
            const accessTokenResponse = await client.getAccessToken();
            const accessToken = accessTokenResponse.token;

            if (!accessToken) {
                console.error("[FCM v1] Failed to obtain access token");
                return;
            }

            console.log(`[FCM v1] Sending push to ${args.tokens.length} tokens...`);

            // HTTP v1 sends one message per request
            const results = await Promise.all(args.tokens.map(async (token) => {
                try {
                    const response = await fetch(
                        `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${accessToken}`,
                            },
                            body: JSON.stringify({
                                message: {
                                    token: token,
                                    notification: {
                                        title: args.title,
                                        body: args.body,
                                    },
                                    data: args.data || {},
                                    webpush: {
                                        fcm_options: {
                                            link: "https://skill-swap-gdg.web.app",
                                        },
                                        notification: {
                                            icon: "/favicon.ico",
                                        }
                                    }
                                },
                            }),
                        }
                    );

                    const resultData = await response.json();
                    return { token: token.substring(0, 10) + "...", status: response.status, result: resultData };
                } catch (err) {
                    console.error(`[FCM v1] Error sending to token ${token.substring(0, 10)}...:`, err);
                    return { token: token.substring(0, 10) + "...", error: String(err) };
                }
            }));

            console.log("[FCM v1] Results summary:", JSON.stringify(results));
            return results;

        } catch (error) {
            console.error("[FCM v1] Fatal error in push action:", error);
            throw error;
        }
    },
});
