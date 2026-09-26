import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJb4sIVnni45KPXPFvpP2-l2yXiBGkcmQ",
  authDomain: "avaliacaoavancacafe.firebaseapp.com",
  projectId: "avaliacaoavancacafe",
  storageBucket: "avaliacaoavancacafe.firebasestorage.app",
  messagingSenderId: "751870170365",
  appId: "1:751870170365:web:b9d0970babeb3d13455a94",
  measurementId: "G-7W30SBG7G8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);