import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAkSrFFkyRn6OTFSWezYf8T74HNpBV_7d4",
  authDomain: "loginonecart-2e8c2.firebaseapp.com",
  projectId: "loginonecart-2e8c2",
  storageBucket: "loginonecart-2e8c2.firebasestorage.app",
  messagingSenderId: "162740204055",
  appId: "1:162740204055:web:60edd9a3d50751f0466252"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
