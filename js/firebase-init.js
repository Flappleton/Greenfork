// Your web app's Firebase configuration
// !! REPLACE WITH YOUR ACTUAL CONFIG VALUES FROM FIREBASE CONSOLE !!
const firebaseConfig = {
    apiKey: "AIzaSyA8HrWqLrY-MaeM9ECueMpGiz26UrN7QnQ",
    authDomain: "greenfork-alpha.firebaseapp.com",
    projectId: "greenfork-alpha",
    storageBucket: "greenfork-alpha.firebasestorage.app",
    messagingSenderId: "322988359787",
    appId: "1:322988359787:web:12b68b7f97f7b384fcf12e",
    measurementId: "G-ZTJTRHSE83" // Optional, only if you enabled Analytics
};

// Initialize Firebase
try {
    const app = firebase.initializeApp(firebaseConfig);
    // Make auth and db globally accessible for simplicity in this multi-file setup
    // (Better practice in larger apps might use modules or dependency injection)
    window.auth = firebase.auth();
    window.db = firebase.firestore();
    console.log("Firebase initialized successfully!");

} catch (error) {
    console.error("Error initializing Firebase:", error);
    // Optionally display an error message to the user on the page
    // document.body.innerHTML = 'Error initializing connection. Please try again later.';
}