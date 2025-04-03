// js/firebase-init.js

// Use ONLY the configuration for your PRIMARY project (greenfork-alpha)
const firebaseConfig = {
    apiKey: "AIzaSyA8HrWqLrY-MaeM9ECueMpGiz26UrN7QnQ", // From greenfork-alpha
    authDomain: "greenfork-alpha.firebaseapp.com",
    projectId: "greenfork-alpha",
    storageBucket: "greenfork-alpha.appspot.com",     // Common format, check your console
    messagingSenderId: "322988359787",
    appId: "1:322988359787:web:12b68b7f97f7b384fcf12e",
    measurementId: "G-ZTJTRHSE83" // Optional
};

// Initialize Firebase ONCE using V8 syntax
try {
    // Check if Firebase has already been initialized
    if (!firebase.apps.length) {
         firebase.initializeApp(firebaseConfig); // Initialize the default app
         console.log("Firebase initialized successfully!");
    } else {
         firebase.app(); // Get the default app if already initialized
         console.log("Firebase already initialized.");
    }

    // Make auth and db globally accessible from the default app
    window.auth = firebase.auth();
    window.db = firebase.firestore();

} catch (error) {
    console.error("Error initializing Firebase:", error);
    // Provide feedback to the user
    const body = document.querySelector('body');
    if (body) {
         const errorDiv = document.createElement('div');
         errorDiv.style.backgroundColor = 'red';
         errorDiv.style.color = 'white';
         errorDiv.style.padding = '10px';
         errorDiv.style.textAlign = 'center';
         errorDiv.style.position = 'fixed';
         errorDiv.style.top = '0';
         errorDiv.style.left = '0';
         errorDiv.style.width = '100%';
         errorDiv.style.zIndex = '9999';
         errorDiv.textContent = 'Error connecting to services. Please refresh or try again later.';
         body.prepend(errorDiv);
    }
}