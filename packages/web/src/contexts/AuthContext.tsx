/**
 * Authentication Context Provider
 * Manages Firebase Auth state and synchronizes with Convex
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import {
    type User,
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    updateProfile,
} from "firebase/auth";
import { useMutation } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import type { Id } from "../../../convex/convex/_generated/dataModel";

interface AuthContextType {
    user: User | null;
    convexUserId: Id<"users"> | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [convexUserId, setConvexUserId] = useState<Id<"users"> | null>(null);
    const getOrCreateUser = useMutation(api.auth.getOrCreateUser);
    const heartbeat = useMutation(api.presence.heartbeat);

    // 1. Listen for Firebase Auth changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            if (!firebaseUser) {
                setConvexUserId(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // 2. Sync with Convex when Firebase user is available
    useEffect(() => {
        if (user && !convexUserId) {
            const syncUser = async () => {
                try {
                    const id = await getOrCreateUser({
                        firebaseUid: user.uid,
                        email: user.email || "",
                        displayName: user.displayName || "Anonymous",
                        photoURL: user.photoURL || undefined,
                    });
                    setConvexUserId(id);
                } catch (error) {
                    console.error("Error syncing user with Convex:", error);
                } finally {
                    setLoading(false);
                }
            };
            syncUser();
        }
    }, [user, getOrCreateUser, convexUserId]);

    // 3. Presence Heartbeat
    useEffect(() => {
        if (convexUserId) {
            // Initial heartbeat
            heartbeat({ userId: convexUserId });

            const interval = setInterval(() => {
                heartbeat({ userId: convexUserId });
            }, 25000); // Every 25 seconds

            return () => clearInterval(interval);
        }
    }, [convexUserId, heartbeat]);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
            throw error;
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Error signing in with email:", error);
            throw error;
        }
    };

    const signUpWithEmail = async (email: string, password: string, displayName: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // Update display name in Firebase Auth
            await updateProfile(userCredential.user, {
                displayName: displayName
            });

            // Force token refresh to include new profile data
            await userCredential.user.getIdToken(true);
        } catch (error) {
            console.error("Error signing up with email:", error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
            throw error;
        }
    };

    const value = {
        user,
        convexUserId,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
