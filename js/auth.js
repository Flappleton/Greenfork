// Make sure this code runs after the Firebase SDKs and firebase-init.js are loaded

document.addEventListener('DOMContentLoaded', function () {
    // --- Firebase Auth References ---
    // Check if the main Firebase SDK object is available
    if (typeof firebase === 'undefined' || typeof firebase.auth === 'undefined' || typeof firebase.firestore === 'undefined') {
        console.error("Firebase SDK not loaded or initialized correctly before auth.js ran.");
        // Optionally disable forms or display a more critical error message here
        const authForms = document.querySelectorAll('#signUpForm, #signInForm');
        authForms.forEach(form => {
            const submitButton = form.querySelector('button[type="submit"]');
            if(submitButton) submitButton.disabled = true;
            const errorDiv = form.querySelector('[id$="Error"]'); // Matches signUpError and signInError
            if(errorDiv) errorDiv.textContent = 'Critical Error: Firebase connection failed. Please refresh.';
        });
        return; // Stop execution if Firebase isn't ready
    }

    // If the SDK is ready, get local references to auth and db services
    const auth = firebase.auth();
    const db = firebase.firestore();
    console.log("Auth.js: Found Firebase auth and db services."); // Added confirmation log


    // --- Get DOM Elements ---
    // We get elements inside handlers or listeners where possible,
    // as they might not exist on every page this script runs on.

    // --- Helper Function to Close Modals ---
    function closeModal(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            // Try to get an existing instance first
            let modalInstance = bootstrap.Modal.getInstance(modalElement);
            // If no instance exists, create one (modal might have been opened via data attributes)
            if (!modalInstance) {
                 // Only create if needed, might not be necessary just to hide
                 // modalInstance = new bootstrap.Modal(modalElement);
            }
             // If an instance exists or could be potentially created, try hiding
             // Use the static method if possible for robustness
             const staticModal = bootstrap.Modal.getInstance(modalElement);
             if(staticModal) {
                staticModal.hide();
             } else {
                 // Fallback if needed, though hide() should work if element exists
                 // console.warn(`Could not get Bootstrap Modal instance for #${modalId} to hide it.`);
             }
        } else {
             console.warn(`Modal element #${modalId} not found.`);
        }
    }

    // --- Sign Up Handler ---
    const signUpForm = document.getElementById('signUpForm');
    if (signUpForm) {
        const signUpNameInput = document.getElementById('signUpName');
        const signUpAccountTypeInput = document.getElementById('signUpAccountType');
        const signUpEmailInput = document.getElementById('signUpEmail');
        const signUpPasswordInput = document.getElementById('signUpPassword');
        const signUpError = document.getElementById('signUpError');

        signUpForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent default form submission
            if (signUpError) signUpError.textContent = ''; // Clear previous errors

            const name = signUpNameInput.value.trim();
            const accountType = signUpAccountTypeInput.value;
            const email = signUpEmailInput.value.trim();
            const password = signUpPasswordInput.value;

            if (!name || !accountType || !email || !password) {
                 if (signUpError) signUpError.textContent = 'Please fill in all fields.';
                 return;
            }
            if (password.length < 6) {
                if (signUpError) signUpError.textContent = 'Password must be at least 6 characters long.';
                return;
            }

            // Use the locally scoped 'auth' variable
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Signed in
                    const user = userCredential.user;
                    console.log('Sign up successful:', user.uid);

                    // Now store additional user info in Firestore using locally scoped 'db'
                    return db.collection('users').doc(user.uid).set({
                        name: name,
                        accountType: accountType,
                        email: email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        // Add other fields as needed (e.g., location: null, verificationStatus: 'unverified')
                    });
                })
                .then(() => {
                    console.log('User profile created in Firestore');
                    signUpForm.reset(); // Clear the form
                    closeModal('signUpModal'); // Close the sign-up modal
                    // The onAuthStateChanged listener will handle UI updates
                })
                .catch((error) => {
                    console.error('Sign up error:', error);
                    if (signUpError) signUpError.textContent = error.message; // Display Firebase error message
                });
        });
    }

    // --- Sign In Handler ---
    const signInForm = document.getElementById('signInForm');
    if (signInForm) {
        const signInError = document.getElementById('signInError'); // Get error div reference

        signInForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if(signInError) signInError.textContent = ''; // Clear previous errors

            const emailInput = document.getElementById('signInEmail'); // Get input inside handler
            const passwordInput = document.getElementById('signInPassword'); // Get input inside handler

             if (!emailInput || !passwordInput) {
                 console.error("Sign in email or password input not found!");
                 if(signInError) signInError.textContent = 'An unexpected error occurred.';
                 return;
             }

            const email = emailInput.value.trim();
            const password = passwordInput.value;

             if (!email || !password) {
                 if(signInError) signInError.textContent = 'Please enter email and password.';
                 return;
             }

            // Use the locally scoped 'auth' variable
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Signed in
                    console.log('Sign in successful:', userCredential.user.uid);
                    signInForm.reset();
                    closeModal('signInModal');
                    // onAuthStateChanged handles UI updates
                })
                .catch((error) => {
                    console.error('Sign in error:', error);
                     if(signInError) signInError.textContent = error.message; // Display error
                });
        });
    }

    // --- Logout Handler ---
    // Add listener directly to the navbar UL, checking target ID for delegation
    const navbarUl = document.querySelector('.navbar-nav');
    if (navbarUl) {
        navbarUl.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'logoutLink') {
                e.preventDefault();
                 // Use the locally scoped 'auth' variable
                auth.signOut()
                    .then(() => {
                        console.log('Sign out successful');
                        // Optional: Redirect to home page after logout
                        // if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') { // Avoid redirect loop on index
                        //      window.location.href = 'index.html';
                        // }
                    })
                    .catch((error) => {
                        console.error('Sign out error:', error);
                    });
            }
        });
    }

    // --- Auth State Change Listener ---
    // Use the locally scoped 'auth' variable
    auth.onAuthStateChanged(async (user) => { // Made async to await Firestore reads
        console.log("Auth state changed. User:", user ? user.uid : 'null');

        // Get Navbar Links each time state changes, as they might be added/removed
        const signInLi = document.getElementById('signInLi');
        const signUpLi = document.getElementById('signUpLi');
        const logoutLi = document.getElementById('logoutLi');
        const profileLi = document.getElementById('profileLi');
        const profileLink = document.getElementById('profileLink'); // The <a> tag inside profileLi

        if (user) {
            // User is signed in
            if(signInLi) signInLi.classList.add('d-none');
            if(signUpLi) signUpLi.classList.add('d-none');
            if(logoutLi) logoutLi.classList.remove('d-none');
            if(profileLi) profileLi.classList.remove('d-none');

             // --- Personalize Navbar ---
             if(profileLink) { // Check if the profile link element exists
                 try {
                      // Use the locally scoped 'db' variable
                     const userDocRef = db.collection('users').doc(user.uid);
                     const userDoc = await userDocRef.get(); // Use await since function is async

                     if (userDoc.exists) {
                         const userData = userDoc.data();
                         console.log("User data fetched:", userData);
                         profileLink.textContent = `${userData.name}`; // Show user's name

                         // Customize profile link destination based on account type
                         // Ensure these target pages exist or will exist soon
                         if (userData.accountType === 'Merchant') {
                              profileLink.href = 'merchant.html'; // Link to merchant page
                         } else if (userData.accountType === 'Seeker') {
                              profileLink.href = 'seeker.html'; // Link to seeker page
                         } else {
                              profileLink.href = '#'; // Default link if type unknown
                         }
                         profileLink.title = `Logged in as ${userData.name} (${userData.accountType})`; // Add a tooltip

                     } else {
                         // User document doesn't exist in Firestore (edge case)
                         console.warn("User document not found in Firestore for UID:", user.uid);
                         profileLink.textContent = "Profile"; // Fallback text
                         profileLink.href = '#';
                         profileLink.title = "Profile data not found";
                     }
                 } catch (error) {
                     console.error("Error fetching user data:", error);
                      profileLink.textContent = "Profile"; // Fallback text on error
                      profileLink.href = '#';
                      profileLink.title = "Error loading profile";
                 }
             } else {
                 console.warn("Profile link element ('profileLink') not found in Navbar.");
             }

        } else {
            // User is signed out
            if(signInLi) signInLi.classList.remove('d-none');
            if(signUpLi) signUpLi.classList.remove('d-none');
            if(logoutLi) logoutLi.classList.add('d-none');
            if(profileLi) profileLi.classList.add('d-none');
            // Reset profile link if needed
            // if(profileLink) {
            //     profileLink.textContent = "My Profile";
            //     profileLink.href = '#';
            //     profileLink.title = '';
            // }
        }
    });

}); // End DOMContentLoaded