// js/merchant.js

document.addEventListener('DOMContentLoaded', () => {
    // Ensure Firebase services are available (defined in firebase-init.js)
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
        console.error("Firebase auth or db not initialized for merchant.js");
        // Optionally hide merchant-specific sections or show an error
        const sectionsToHide = document.querySelectorAll('#stores, #listings, .merchant-section .btn-orange');
        sectionsToHide.forEach(el => el.style.display = 'none');
        // You could add an error message to the page here
        return;
    }

    const storeContainer = document.getElementById('storeContainer');
    const addStoreBtn = document.getElementById('addStoreBtn');
    const storeForm = document.getElementById('storeForm');
    const storeModalEl = document.getElementById('storeModal');
    const storeModal = storeModalEl ? new bootstrap.Modal(storeModalEl) : null; // Get modal instance
    const storeFormError = document.getElementById('storeFormError'); // Error div in store modal

     // --- Check Auth State and User Type ---
    auth.onAuthStateChanged(async user => {
        if (user) {
            // User is signed in, check if they are a merchant
            console.log("Merchant page: User logged in", user.uid);
            const userDocRef = db.collection('users').doc(user.uid);
            try {
                const userDoc = await userDocRef.get();
                if (userDoc.exists && userDoc.data().accountType === 'Merchant') {
                    console.log("User is a Merchant.");
                    // User is a merchant, load their stores
                    loadMerchantStores(user.uid);
                    setupStoreForm(user.uid); // Setup the form submission listener

                    // Show merchant specific sections if hidden previously (optional)
                     document.querySelector('.merchant-section').style.display = 'block'; // Ensure intro is visible
                    if (document.getElementById('stores')) document.getElementById('stores').style.display = 'block';
                    if (document.getElementById('listings')) document.getElementById('listings').style.display = 'block';


                } else {
                    // Not a merchant or user doc doesn't exist
                    console.log("User is not a Merchant or profile incomplete.");
                    displayNotMerchantMessage();
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                displayNotMerchantMessage("Error checking account type.");
            }
        } else {
            // User is signed out
            console.log("Merchant page: User logged out.");
            displayNotMerchantMessage("Please sign in as a Merchant to access this page.");
        }
    });

    // --- Function to Display Message for Non-Merchants ---
    function displayNotMerchantMessage(message = "You must be logged in as a Merchant to manage stores and listings.") {
        // Hide merchant-specific sections
        const sectionsToHide = document.querySelectorAll('#stores, #listings');
        sectionsToHide.forEach(el => el.style.display = 'none');

        // Display message (e.g., in the intro section)
        const introSection = document.querySelector('.merchant-section .container');
        if (introSection) {
             let msgElement = introSection.querySelector('.not-merchant-message');
             if (!msgElement) {
                 msgElement = document.createElement('div');
                 msgElement.className = 'alert alert-warning mt-4 not-merchant-message'; // Use Bootstrap alert
                 introSection.appendChild(msgElement);
             }
             msgElement.textContent = message;
        }
         // Optionally hide the default "Start Selling" button if they can't use it
         const startSellingBtn = document.querySelector('.merchant-section .btn-orange');
         if (startSellingBtn) startSellingBtn.style.display = 'none';
    }


    // --- Function to Load and Display Merchant Stores ---
    async function loadMerchantStores(merchantId) {
        if (!storeContainer) return;

         // Clear existing stores (except the "Add Store" button)
         storeContainer.innerHTML = ''; // Clear everything first
         storeContainer.appendChild(addStoreBtn); // Re-add the button

        console.log(`Loading stores for merchant: ${merchantId}`);
        try {
            const storesRef = db.collection('stores');
            const query = storesRef.where('merchantId', '==', merchantId).orderBy('createdAt', 'desc');
            const snapshot = await query.get();

            if (snapshot.empty) {
                console.log('No stores found for this merchant.');
                 // Optionally display a message like "You haven't added any stores yet."
                 const noStoresMsg = document.createElement('p');
                 noStoresMsg.textContent = 'You haven\'t added any stores yet. Click "+ Add New Store" to start!';
                 noStoresMsg.className = 'text-muted ms-3'; // Add some margin
                 addStoreBtn.insertAdjacentElement('afterend', noStoresMsg); // Place it after the button

            } else {
                 console.log(`Found ${snapshot.docs.length} stores.`);
                snapshot.forEach(doc => {
                    const storeData = doc.data();
                    const storeId = doc.id;
                    displayStoreCard(storeData, storeId);
                });
            }
        } catch (error) {
            console.error("Error loading stores: ", error);
            // Display an error message on the page
             const errorMsg = document.createElement('p');
             errorMsg.textContent = 'Error loading your stores. Please try refreshing.';
             errorMsg.className = 'text-danger ms-3';
             addStoreBtn.insertAdjacentElement('afterend', errorMsg);
        }
    }

    // --- Function to Create and Display a Single Store Card ---
    function displayStoreCard(storeData, storeId) {
         if (!storeContainer) return;

         const card = document.createElement('div');
         card.className = 'store-card';
         card.setAttribute('data-id', storeId); // Store the ID for potential edits/deletes

         // Basic structure, can be enhanced
         card.innerHTML = `
             <h3>${storeData.storeName || 'Unnamed Store'}</h3>
             <p><strong>Location:</strong> ${storeData.location || 'Not specified'}</p>
             ${storeData.description ? `<p><em>${storeData.description}</em></p>` : ''}
             <button class="btn btn-sm btn-outline-secondary mt-2 btn-edit-store" data-id="${storeId}">Edit</button>
             <button class="btn btn-sm btn-outline-danger mt-2 btn-delete-store" data-id="${storeId}">Delete</button>
         `;

        // Insert the new card before the "Add Store" button for better layout
        storeContainer.insertBefore(card, addStoreBtn);

         // Add event listeners for edit/delete (implement functions later)
         card.querySelector('.btn-edit-store').addEventListener('click', () => editStore(storeId, storeData));
         card.querySelector('.btn-delete-store').addEventListener('click', () => deleteStore(storeId));
    }

    // --- Function to Setup Store Form Submission ---
    function setupStoreForm(merchantId) {
        if (!storeForm || !storeModal) return;

         // Store the ID of the store being edited (null if adding new)
         let editingStoreId = null;

        storeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (storeFormError) storeFormError.textContent = ''; // Clear previous errors

            // Get form values
            const storeName = document.getElementById('storeName').value.trim();
            const storeLocation = document.getElementById('storeLocation').value.trim();
            const storeDescription = document.getElementById('storeDescription').value.trim();

            if (!storeName || !storeLocation) {
                if (storeFormError) storeFormError.textContent = 'Store Name and Location are required.';
                return;
            }

            const storeData = {
                merchantId: merchantId,
                storeName: storeName,
                location: storeLocation,
                description: storeDescription,
                // Add/update timestamp only when creating/specifically updating
            };

            try {
                 if (editingStoreId) {
                     // Update existing store
                     console.log(`Updating store: ${editingStoreId}`);
                     const storeRef = db.collection('stores').doc(editingStoreId);
                     await storeRef.update({ // Use update to modify existing fields
                          storeName: storeName,
                          location: storeLocation,
                          description: storeDescription,
                          // You might want to add an 'updatedAt' timestamp here
                          // updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                     });
                     console.log("Store updated successfully");
                 } else {
                     // Add new store
                     console.log(`Adding new store for merchant: ${merchantId}`);
                     storeData.createdAt = firebase.firestore.FieldValue.serverTimestamp(); // Add timestamp for new stores
                     const docRef = await db.collection('stores').add(storeData);
                     console.log("Store added successfully with ID:", docRef.id);
                 }

                storeForm.reset(); // Clear form
                editingStoreId = null; // Reset editing state
                 if(storeModal) storeModal.hide(); // Hide modal on success
                loadMerchantStores(merchantId); // Refresh the store list display

            } catch (error) {
                console.error("Error saving store: ", error);
                if (storeFormError) storeFormError.textContent = `Error saving store: ${error.message}`;
            }
        });

         // Reset editing state when modal is closed
         storeModalEl.addEventListener('hidden.bs.modal', () => {
            editingStoreId = null;
            storeForm.reset();
             if (storeFormError) storeFormError.textContent = '';
             document.getElementById('storeModalLabel').textContent = 'Add New Store'; // Reset title
         });

         // Expose editStore globally or attach listeners differently if needed
         window.editStore = (storeId, storeData) => {
             console.log(`Editing store: ${storeId}`, storeData);
             editingStoreId = storeId; // Set editing state

             // Populate the form
             document.getElementById('storeName').value = storeData.storeName || '';
             document.getElementById('storeLocation').value = storeData.location || '';
             document.getElementById('storeDescription').value = storeData.description || '';
              document.getElementById('storeModalLabel').textContent = 'Edit Store'; // Change title

             // Show the modal
             if(storeModal) storeModal.show();
         };

         window.deleteStore = async (storeId) => {
             console.log(`Attempting to delete store: ${storeId}`);
             if (!confirm(`Are you sure you want to delete this store? This cannot be undone.`)) {
                 return; // User cancelled
             }

             try {
                 await db.collection('stores').doc(storeId).delete();
                 console.log("Store deleted successfully");
                  // Remove card from UI immediately
                 const cardToRemove = storeContainer.querySelector(`.store-card[data-id="${storeId}"]`);
                 if (cardToRemove) cardToRemove.remove();
                 // Optionally: Add check if any stores remain and show message if not

                  // TODO: Add logic here later to also delete associated LISTINGS for this store

             } catch (error) {
                 console.error("Error deleting store:", error);
                 alert(`Error deleting store: ${error.message}`); // Show error to user
             }
         };
    }


    // --- Initial Setup ---
    // The auth.onAuthStateChanged listener handles the initial loading based on login state.

}); // End DOMContentLoaded