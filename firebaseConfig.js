// firebaseConfig.js — VERSÃO CORRETA (browser puro)

// Firebase CDN (NÃO usar "firebase/app")
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
// Config do seu projeto
const firebaseConfig = {
  apiKey: "AIzaSyBwlqAtEhXAEpDDWpr20l0234VvwIlcB2w",
  authDomain: "ironpenance-5531b.firebaseapp.com",
  projectId: "ironpenance-5531b",
  storageBucket: "ironpenance-5531b.appspot.com",
  messagingSenderId: "770140430330",
  appId: "1:770140430330:web:0a2d3068c402268b278e43",
  measurementId: "G-4XWQ6FN1BN"
};

// Inicializa Firebase
export const app = initializeApp(firebaseConfig);

// 🔥 ISSO AQUI ERA O QUE FALTAVA
export const auth = getAuth(app);
export const db = getFirestore(app);
