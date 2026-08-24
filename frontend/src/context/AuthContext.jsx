import { createContext, useContext, useEffect, useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(true);

    async function signup(name, email, password) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });

        // Save user to Firestore
        await setDoc(doc(db, 'users', result.user.uid), {
            name,
            email,
            role: 'user',
            generations: 0,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            status: 'active'
        });
        return result;
    }

    async function login(email, password) {
        setProfileLoading(true);
        const result = await signInWithEmailAndPassword(auth, email, password);
        // Update last login
        await setDoc(doc(db, 'users', result.user.uid), {
            lastLogin: serverTimestamp()
        }, { merge: true });
        // Eagerly fetch profile so role is available immediately for routing
        const snap = await getDoc(doc(db, 'users', result.user.uid));
        if (snap.exists()) setUserProfile(snap.data());
        setProfileLoading(false);
        return result;
    }

    function logout() {
        return signOut(auth);
    }

    async function fetchUserProfile(uid) {
        setProfileLoading(true);
        try {
            // Small delay to ensure auth token has propagated to Firestore
            await new Promise(r => setTimeout(r, 300));
            const snap = await getDoc(doc(db, 'users', uid));
            if (snap.exists()) {
                setUserProfile(snap.data());
            } else {
                // Retry once after another short delay
                await new Promise(r => setTimeout(r, 500));
                const snap2 = await getDoc(doc(db, 'users', uid));
                if (snap2.exists()) setUserProfile(snap2.data());
            }
        } catch (e) {
            console.error('fetchUserProfile error:', e);
        }
        setProfileLoading(false);
    }

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                await fetchUserProfile(user.uid);
            } else {
                setUserProfile(null);
                setProfileLoading(false);
            }
            setLoading(false);
        });
        return unsub;
    }, []);

    const value = { currentUser, userProfile, profileLoading, signup, login, logout, fetchUserProfile };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}