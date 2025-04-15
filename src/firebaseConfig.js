// Import the functions you need from the SDKs you need
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBNABeIZKU20G_wKNyG-RVz1f6e0kcKYCo",
  authDomain: "picture-hunter-api.firebaseapp.com",
  projectId: "picture-hunter-api",
  storageBucket: "picture-hunter-api.appspot.com",
  messagingSenderId: "87378619297",
  appId: "1:87378619297:web:9ad5c97311489b3cd739e0",
  measurementId: "G-PXK14FFDMW"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const storage = firebase.storage();


// エミュレータへの接続
// connectFirestoreEmulator(db, "localhost", 8080);
// connectStorageEmulator(storage, "localhost", 9199);

export { db, storage };
