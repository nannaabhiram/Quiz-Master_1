// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCNi-F0kq22_UP6HynKgSnpJ4WOdF_nTLY",
  authDomain: "quiz-master-98d6b-9629b.firebaseapp.com",
  projectId: "quiz-master-98d6b-9629b",
  storageBucket: "quiz-master-98d6b-9629b.firebasestorage.app",
  messagingSenderId: "768097303827",
  appId: "1:768097303827:web:0d9976dd069da4a550aee6",
  measurementId: "G-VBKD6NH162"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;
