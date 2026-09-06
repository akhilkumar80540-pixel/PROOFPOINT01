import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // Added this back
import { getAuth } from "firebase/auth"; // Added this back

const firebaseConfig = {
  apiKey: "AIzaSyCwFzVdpV2pfDk5nRB5jpFlamP-R49wl1E",
  authDomain: "proofpoint-01.firebaseapp.com",
  projectId: "proofpoint-01",
  storageBucket: "proofpoint-01.firebasestorage.app",
  messagingSenderId: "239535267742",
  appId: "1:239535267742:web:e2f92ab9f2bebf633cc08f",
  measurementId: "G-CWYQY28VNJ"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// THESE TWO LINES ARE CRITICAL
export const db = getFirestore(app);
export const auth = getAuth(app);