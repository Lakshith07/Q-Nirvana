// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDRgC4HxdZYg-fxhrJCRmhqo8yiwTcy6kw",
  authDomain: "q-nirvana.firebaseapp.com",
  projectId: "q-nirvana",
  storageBucket: "q-nirvana.firebasestorage.app",
  messagingSenderId: "827048085543",
  appId: "1:827048085543:web:2a1121c39eeed17cb86602"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage, app };
