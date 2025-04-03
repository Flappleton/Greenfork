// Your web app's Firebase configuration
// !! REPLACE WITH YOUR ACTUAL CONFIG VALUES FROM FIREBASE CONSOLE !!
const firebaseConfig = {
    apiKey: "AIzaSyA8HrWqLrY-MaeM9ECueMpGiz26UrN7QnQ",
    authDomain: "greenfork-alpha.firebaseapp.com",
    projectId: "greenfork-alpha",
    storageBucket: "greenfork-alpha.firebasestorage.app",
    messagingSenderId: "322988359787",
    appId: "1:322988359787:web:12b68b7f97f7b384fcf12e",
    measurementId: "G-ZTJTRHSE83", // Optional, only if you enabled Analytics

    //Compost-Firebase
    apiKey: "AIzaSyAuTcWKtzTmqtvBqLeWHQtAnw0TO8FdRMY",
    authDomain: "greenfork-compost.firebaseapp.com",
    projectId: "greenfork-compost",
    storageBucket: "greenfork-compost.firebasestorage.app",
    messagingSenderId: "1014388321188",
    appId: "1:1014388321188:web:8ab72c0bf52d5b41b1af31",
    measurementId: "G-YXJLT15P9R"
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

firebase.initializeApp(firebaseConfig);
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
