// js/firebase-init.js

// Config remains the same...
const firebaseConfig = {
    apiKey: "AIzaSyA8HrWqLrY-MaeM9ECueMpGiz26UrN7QnQ",
    authDomain: "greenfork-alpha.firebaseapp.com",
    projectId: "greenfork-alpha",
    storageBucket: "greenfork-alpha.appspot.com",
    messagingSenderId: "322988359787",
    appId: "1:322988359787:web:12b68b7f97f7b384fcf12e",
    measurementId: "G-ZTJTRHSE83"
};

// Initialize Firebase ONCE using V8 syntax
try {
    let app;
    // Check if Firebase has already been initialized
    if (!firebase.apps.length) {
         app = firebase.initializeApp(firebaseConfig); // Initialize and store app instance
         console.log("Firebase initialized successfully!");
    } else {
         app = firebase.app(); // Get the default app if already initialized
         console.log("Firebase already initialized.");
    }

    // ---- MODIFIED PART ----
    // Check if auth and firestore methods exist before assigning globally
    // This ensures the respective SDKs have loaded and attached their functions
    if (typeof firebase.auth === 'function') {
        window.auth = firebase.auth();
        console.log("Firebase Auth service ready.");
    } else {
        console.error("Firebase Auth SDK ('firebase-auth.js') did not load correctly!");
        // Handle error - maybe show a message or disable auth features
    }

    if (typeof firebase.firestore === 'function') {
        window.db = firebase.firestore();
        console.log("Firestore service ready.");
    } else {
        console.error("Firebase Firestore SDK ('firebase-firestore.js') did not load correctly!");
        // Handle error - maybe show a message or disable DB features
    }
    // ---- END MODIFIED PART ----

} catch (error) {
    console.error("Error initializing Firebase:", error);
    // Provide feedback to the user... (error div code omitted for brevity)
}