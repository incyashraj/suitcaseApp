// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDGAI-Y0jWMkkTwVa3pWRYTRnIjeR5IgDo",
  authDomain: "suitcase-e579b.firebaseapp.com",
  projectId: "suitcase-e579b",
  storageBucket: "suitcase-e579b.firebasestorage.app",
  messagingSenderId: "535507830039",
  appId: "1:535507830039:web:1380d5f29396b0a614e352",
  measurementId: "G-1E9GL03TX0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Auth
export const auth = getAuth(app);