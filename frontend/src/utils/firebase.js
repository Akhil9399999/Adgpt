// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyC_K8YVpo5yguN2Z0eRA_mKCZlYfuOVjOc",
    authDomain: "newadgpt-692fb.firebaseapp.com",
    projectId: "newadgpt-692fb",
    storageBucket: "newadgpt-692fb.firebasestorage.app",
    messagingSenderId: "214569007580",
    appId: "1:214569007580:web:1372637fe455f552ccf719",
    measurementId: "G-S1DT6509XQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize and export Auth and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);