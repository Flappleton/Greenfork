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

    // --- DOM Element References ---
    // Store Elements
    const storeContainer = document.getElementById('storeContainer');
    const addStoreBtn = document.getElementById('addStoreBtn'); // The "+ Add New Store" button itself
    const storeForm = document.getElementById('storeForm');
    const storeModalEl = document.getElementById('storeModal');
    const storeModal = storeModalEl ? new bootstrap.Modal(storeModalEl) : null; // Get modal instance
    const storeFormError = document.getElementById('storeFormError'); // Error div in store modal

    // Listing Elements
    const listingContainer = document.getElementById('listingContainer');
    const addListingBtn = document.getElementById('addListingBtn'); // The "+ Add New Listing" button
    const listingModalEl = document.getElementById('listingModal');
    const listingModal = listingModalEl ? new bootstrap.Modal(listingModalEl) : null;
    const listingForm = document.getElementById('listingForm');
    const listingFormError = document.getElementById('listingFormError');
    const listingStoreSelect = document.getElementById('listingStore'); // Store dropdown in listing modal
    const listingFoodTypeSelect = document.getElementById('listingFoodType'); // Food type dropdown
    const poolingOptionDiv = document.getElementById('poolingOptionDiv'); // Checkbox div for pooling
    const listingPoolingCheckbox = document.getElementById('listingPooling'); // Pooling checkbox

    // --- State Variable ---
    let merchantStores = []; // Array to hold {id, name} of merchant's stores

    // --- HTML Escaping Helper ---
     function escapeHtml(unsafe) {
         if (typeof unsafe !== 'string') return ''; // Handle non-string inputs
         return unsafe
              .replace(/&/g, "&")
              .replace(/</g, "<")
              .replace(/>/g, ">")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "'");
     }

    // --- Function to Display Message for Non-Merchants ---
    function displayNotMerchantMessage(message = "You must be logged in as a Merchant to manage stores and listings.") {
        // Hide merchant-specific sections
        const sectionsToHide = document.querySelectorAll('#stores, #listings');
        sectionsToHide.forEach(el => el.style.display = 'none');

        // Display message (e.g., in the intro section)
        const introContainer = document.querySelector('.merchant-section .container');
        if (introContainer) {
             let msgElement = introContainer.querySelector('.not-merchant-message');
             if (!msgElement) {
                 msgElement = document.createElement('div');
                 msgElement.className = 'alert alert-warning mt-4 not-merchant-message'; // Use Bootstrap alert
                 const heading = introContainer.querySelector('h2');
             msgElement.textContent = message;
             msgElement.style.display = 'block'; // Ensure it's visible
        }
         const startSellingBtn = document.querySelector('.merchant-section .btn-orange');
         if (startSellingBtn) startSellingBtn.style.display = 'none';
    }           if(heading) { heading.insertAdjacentElement('afterend', msgElement); }
                 else { introContainer.prepend(msgElement); }
             }
      

    // --- Function to Load and Display Merchant Stores ---
    async function loadMerchantStores(merchantId) {
        if (!storeContainer || !addStoreBtn) {
            console.error("Store container or Add Store button not found");
            return;
        }
        // Clear existing dynamic content
        storeContainer.querySelectorAll('.store-card, .no-stores-message, .error-loading-stores').forEach(el => el.remove());
        merchantStores = []; // Clear local cache

        console.log(`Loading stores for merchant: ${merchantId}`);
        try {
            const storesRef = db.collection('stores');
            const query = storesRef.where('merchantId', '==', merchantId).orderBy('createdAt', 'desc');
            const snapshot = await query.get();

            if (snapshot.empty) {
                console.log('No stores found for this merchant.');
                 const noStoresMsg = document.createElement('p');
                 noStoresMsg.textContent = 'You haven\'t added any stores yet. Click "+ Add New Store" to start!';
                 noStoresMsg.className = 'text-muted ms-3 no-stores-message';
                 addStoreBtn.insertAdjacentElement('afterend', noStoresMsg);
            } else {
                 console.log(`Found ${snapshot.docs.length} stores.`);
                snapshot.forEach(doc => {
                    const storeData = doc.data();
                    const storeId = doc.id;
                    merchantStores.push({ id: storeId, name: storeData.storeName }); // Store data for dropdown
                    displayStoreCard(storeData, storeId); // Display the card
                });
            }
            populateStoreDropdown(); // Populate dropdown after processing all stores
        } catch (error) {
            console.error("Error loading stores: ", error);
             const errorMsg = document.createElement('p');
             errorMsg.textContent = 'Error loading your stores. Please try refreshing.';
             errorMsg.className = 'text-danger ms-3 error-loading-stores';
             addStoreBtn.insertAdjacentElement('afterend', errorMsg);
             if (error.code === 'failed-precondition') {
                console.warn("Firestore query for stores might require an index. Check the detailed error message for a creation link.");
                errorMsg.textContent += ' (A database index might be required - check console for details/link).';
            }
        }
    } // End loadMerchantStores

    // --- Function to Create and Display a Single Store Card ---
    function displayStoreCard(storeData, storeId) {
         if (!storeContainer || !addStoreBtn) return;
         const card = document.createElement('div');
         card.className = 'store-card';
         card.setAttribute('data-id', storeId);
         card.innerHTML = `
             <h3>${escapeHtml(storeData.storeName)}</h3>
             <p><strong>Location:</strong> ${escapeHtml(storeData.location)}</p>
             ${storeData.description ? `<p><em>${escapeHtml(storeData.description)}</em></p>` : ''}
             <button class="btn btn-sm btn-outline-secondary mt-2 btn-edit-store">Edit</button>
             <button class="btn btn-sm btn-outline-danger mt-2 btn-delete-store">Delete</button>
         `;
        storeContainer.insertBefore(card, addStoreBtn);
        card.querySelector('.btn-edit-store').addEventListener('click', () => editStore(storeId, storeData));
        card.querySelector('.btn-delete-store').addEventListener('click', () => deleteStore(storeId));
    } // End displayStoreCard

     // --- Function to Setup Store Form Submission and Edit/Delete Logic ---
    function setupStoreForm(merchantId) {
        if (!storeForm || !storeModal) {
            console.error("Store form or modal not found for setup.");
            return;
        }
        let editingStoreId = null; // Track if editing

        storeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (storeFormError) storeFormError.textContent = '';
            const storeName = document.getElementById('storeName').value.trim();
            const storeLocation = document.getElementById('storeLocation').value.trim();
            const storeDescription = document.getElementById('storeDescription').value.trim();

            if (!storeName || !storeLocation) {
                if (storeFormError) storeFormError.textContent = 'Store Name and Location are required.';
                return;
            }
            const storeDataToSave = { merchantId, storeName, location: storeLocation, description: storeDescription };
            const submitButton = storeForm.querySelector('button[type="submit"]');
            try {
                 if(submitButton) submitButton.disabled = true;
                 if (editingStoreId) {
                     console.log(`Updating store: ${editingStoreId}`);
                     storeDataToSave.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
                     await db.collection('stores').doc(editingStoreId).update(storeDataToSave);
                     console.log("Store updated successfully");
                 } else {
                     console.log(`Adding new store for merchant: ${merchantId}`);
                     storeDataToSave.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                     const docRef = await db.collection('stores').add(storeDataToSave);
                     console.log("Store added successfully with ID:", docRef.id);
                 }
                storeForm.reset();
                editingStoreId = null;
                 if(storeModal) storeModal.hide();
                loadMerchantStores(merchantId); // Refresh display
            } catch (error) {
                console.error("Error saving store: ", error);
                if (storeFormError) storeFormError.textContent = `Error saving store: ${error.message}`;
            } finally {
                 if(submitButton) submitButton.disabled = false;
            }
        });

        if(storeModalEl) {
            storeModalEl.addEventListener('hidden.bs.modal', () => {
                editingStoreId = null; storeForm.reset(); if (storeFormError) storeFormError.textContent = '';
                const modalTitle = document.getElementById('storeModalLabel');
                if (modalTitle) modalTitle.textContent = 'Add New Store';
            });
        }

        window.editStore = (storeId, storeData) => {
             console.log(`Editing store: ${storeId}`, storeData);
             editingStoreId = storeId;
             const nameInput = document.getElementById('storeName');
             const locationInput = document.getElementById('storeLocation');
             const descriptionInput = document.getElementById('storeDescription');
             const modalTitle = document.getElementById('storeModalLabel');
             if(nameInput) nameInput.value = storeData.storeName || '';
             if(locationInput) locationInput.value = storeData.location || '';
             if(descriptionInput) descriptionInput.value = storeData.description || '';
             if (modalTitle) modalTitle.textContent = 'Edit Store';
             if(storeModal) storeModal.show();
         };

        window.deleteStore = async (storeId) => {
            console.log(`Attempting to delete store: ${storeId}`);
            if (!confirm('Are you sure you want to delete this store? This will also delete all associated listings and cannot be undone.')) return;
            try {
                await db.collection('stores').doc(storeId).delete();
                console.log("Store document deleted successfully");
                const listingsQuery = db.collection('listings').where('storeId', '==', storeId);
                const listingsSnapshot = await listingsQuery.get();
                if (!listingsSnapshot.empty) {
                    const batch = db.batch();
                    listingsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                    console.log(`Deleted ${listingsSnapshot.docs.length} associated listings.`);
                }
                loadMerchantStores(merchantId); // Refresh store display
                loadMerchantListings(merchantId); // Refresh listing display
            } catch (error) {
                 console.error("Error deleting store and/or listings:", error);
                 alert(`Error deleting store: ${error.message}`);
            }
        };
    } // End of setupStoreForm

    // --- Function to Populate Store Dropdown in Listing Modal ---
    function populateStoreDropdown() {
        if (!listingStoreSelect) return;
        const currentVal = listingStoreSelect.value; // Preserve selection if possible
        listingStoreSelect.innerHTML = '<option value="" disabled selected>-- Select your store --</option>';
        merchantStores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = escapeHtml(store.name); // Escape name
            if(store.id === currentVal) option.selected = true; // Re-select if editing
            listingStoreSelect.appendChild(option);
        });
    } // End populateStoreDropdown

    // --- Function to Setup Listing Form Submission and Edit/Delete Logic ---
    function setupListingForm(merchantId) {
        if (!listingForm || !listingModal || !poolingOptionDiv || !listingFoodTypeSelect) {
             console.error("Listing form or related elements not found for setup.");
             return;
        }
        let editingListingId = null; // Track if editing

        listingFoodTypeSelect.addEventListener('change', (e) => {
            poolingOptionDiv.style.display = (e.target.value === 'Expired') ? 'block' : 'none';
            if (e.target.value !== 'Expired' && listingPoolingCheckbox) listingPoolingCheckbox.checked = false;
        });

        listingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (listingFormError) listingFormError.textContent = '';

            const selectedStoreId = listingStoreSelect.value;
            const selectedStore = merchantStores.find(s => s.id === selectedStoreId);
            const selectedStoreName = selectedStore ? selectedStore.name : 'Unknown Store';
            const listingName = document.getElementById('listingName').value.trim();
            const foodType = document.getElementById('listingFoodType').value;
            const quantity = document.getElementById('listingQuantity').value.trim();
            const dietaryPref = document.getElementById('listingDietary').value;
            const expiryDate = document.getElementById('listingExpiry').value;
            const price = parseFloat(document.getElementById('listingPrice').value);
            const description = document.getElementById('listingDescription').value.trim();
            const isPoolingAllowed = listingPoolingCheckbox ? listingPoolingCheckbox.checked : false;

            if (!selectedStoreId || !listingName || !foodType || !quantity) {
                if (listingFormError) listingFormError.textContent = 'Store, Listing Title, Food Type, and Quantity are required.';
                return;
            }
             if (isNaN(price) || price < 0) { // Check if price is valid number >= 0
                  if (listingFormError) listingFormError.textContent = 'Price must be a valid number (0 or more).';
                 return;
             }

            const listingData = {
                merchantId, storeId: selectedStoreId, storeName: selectedStoreName, listingName,
                foodType, quantity, dietaryPref, expiryDate: expiryDate || null, price, description,
                isPoolingAllowed: (foodType === 'Expired') ? isPoolingAllowed : false, status: "Available",
            };
            const submitButton = listingForm.querySelector('button[type="submit"]');
            try {
                 if(submitButton) submitButton.disabled = true;
                 if (editingListingId) {
                     console.log(`Updating listing: ${editingListingId}`);
                     listingData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
                     await db.collection('listings').doc(editingListingId).update(listingData);
                     console.log("Listing updated successfully");
                 } else {
                     console.log(`Adding new listing for merchant: ${merchantId}`);
                     listingData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                     const docRef = await db.collection('listings').add(listingData);
                     console.log("Listing added successfully with ID:", docRef.id);
                 }
                listingForm.reset(); editingListingId = null; poolingOptionDiv.style.display = 'none';
                if(listingModal) listingModal.hide();
                loadMerchantListings(merchantId); // Refresh display
            } catch (error) {
                console.error("Error saving listing:", error);
                if (listingFormError) listingFormError.textContent = `Error saving listing: ${error.message}`;
            } finally {
                 if(submitButton) submitButton.disabled = false;
            }
        });

        if(listingModalEl) {
            listingModalEl.addEventListener('hidden.bs.modal', () => {
                 editingListingId = null; listingForm.reset(); if(listingFormError) listingFormError.textContent = '';
                 poolingOptionDiv.style.display = 'none';
                 const modalTitle = document.getElementById('listingModalLabel');
                 if(modalTitle) modalTitle.textContent = 'Add New Listing';
            });
        }

         // Define Edit/Delete functions within scope or make them globally accessible carefully
         window.editListing = (listingId, listingData) => {
             console.log(`Editing listing: ${listingId}`, listingData);
             editingListingId = listingId; // Set editing state

             // Populate the form
             if(listingStoreSelect) listingStoreSelect.value = listingData.storeId || '';
             const nameInput = document.getElementById('listingName');
             const foodTypeInput = document.getElementById('listingFoodType');
             const quantityInput = document.getElementById('listingQuantity');
             const dietaryInput = document.getElementById('listingDietary');
             const expiryInput = document.getElementById('listingExpiry');
             const priceInput = document.getElementById('listingPrice');
             const descriptionInput = document.getElementById('listingDescription');
             const poolingCheckbox = document.getElementById('listingPooling');
             const modalTitle = document.getElementById('listingModalLabel');

             if(nameInput) nameInput.value = listingData.listingName || '';
             if(foodTypeInput) {
                 foodTypeInput.value = listingData.foodType || '';
                 // Trigger change event manually to show/hide pooling div correctly
                 foodTypeInput.dispatchEvent(new Event('change'));
             }
             if(quantityInput) quantityInput.value = listingData.quantity || '';
             if(dietaryInput) dietaryInput.value = listingData.dietaryPref || 'Any';
             if(expiryInput) expiryInput.value = listingData.expiryDate || '';
             if(priceInput) priceInput.value = listingData.price !== undefined ? listingData.price : 0;
             if(descriptionInput) descriptionInput.value = listingData.description || '';
             if(poolingCheckbox && listingData.foodType === 'Expired') {
                 poolingCheckbox.checked = listingData.isPoolingAllowed || false;
             }

             if (modalTitle) modalTitle.textContent = 'Edit Listing'; // Change title
             if(listingModal) listingModal.show();
         };

         window.deleteListing = async (listingId) => {
             console.log(`Attempting to delete listing: ${listingId}`);
             if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) return;
             try {
                 await db.collection('listings').doc(listingId).delete();
                 console.log("Listing deleted successfully");
                 loadMerchantListings(merchantId); // Refresh display
             } catch (error) {
                 console.error("Error deleting listing:", error);
                 alert(`Error deleting listing: ${error.message}`);
             }
         };

    } // End setupListingForm

    // --- Function to Load and Display Merchant's Listings ---
    async function loadMerchantListings(merchantId) {
        if (!listingContainer || !addListingBtn) {
            console.error("Listing container or Add Listing button not found");
            return;
        }
        // Clear existing dynamic content
        listingContainer.querySelectorAll('.listing-card, .no-listings-message, .error-loading-listings').forEach(el => el.remove());

        console.log(`Loading listings for merchant: ${merchantId}`);
        try {
            const listingsRef = db.collection('listings');
            const query = listingsRef.where('merchantId', '==', merchantId).orderBy('createdAt', 'desc');
            const snapshot = await query.get();

            if (snapshot.empty) {
                console.log('No listings found for this merchant.');
                const noListingsMsg = document.createElement('p');
                noListingsMsg.textContent = 'You haven\'t added any listings yet. Click "+ Add New Listing" to start!';
                noListingsMsg.className = 'text-muted ms-3 no-listings-message';
                addListingBtn.insertAdjacentElement('afterend', noListingsMsg);
            } else {
                console.log(`Found ${snapshot.docs.length} listings.`);
                snapshot.forEach(doc => displayListingCard(doc.data(), doc.id));
            }
        } catch (error) {
            console.error("Error loading listings: ", error);
            const errorMsg = document.createElement('p');
            errorMsg.textContent = 'Error loading your listings. Please try refreshing.';
            errorMsg.className = 'text-danger ms-3 error-loading-listings';
            addListingBtn.insertAdjacentElement('afterend', errorMsg);
            if (error.code === 'failed-precondition') {
                 console.warn("Firestore query for listings likely requires an index. Check the detailed error message for a creation link.");
                 errorMsg.textContent += ' (A database index might be required - check console for details/link).';
            }
        }
    } // End loadMerchantListings

    // --- Function to Create and Display a Single Listing Card ---
    function displayListingCard(listingData, listingId) {
         if (!listingContainer || !addListingBtn) return;
         const card = document.createElement('div');
         card.className = 'listing-card'; // Use specific class if different styles needed
         card.setAttribute('data-id', listingId);
         const priceString = listingData.price === 0 ? 'Donation' : `₹${listingData.price}`;
         card.innerHTML = `
             <h3>${escapeHtml(listingData.listingName)}</h3>
             <p><strong>Store:</strong> ${escapeHtml(listingData.storeName)}</p>
             <p><strong>Type:</strong> ${escapeHtml(listingData.foodType)} | <strong>Qty:</strong> ${escapeHtml(listingData.quantity)}</p>
             <p><strong>Price:</strong> ${priceString}</p>
             <p><strong>Status:</strong> <span class="badge bg-${listingData.status === 'Available' ? 'success' : 'secondary'}">${escapeHtml(listingData.status)}</span></p>
             ${listingData.expiryDate ? `<p><small>Expiry: ${listingData.expiryDate}</small></p>` : ''}
             <div class="mt-auto pt-2 text-center"> <!-- Ensure buttons are at bottom -->
                 <button class="btn btn-sm btn-outline-secondary btn-edit-listing">Edit</button>
                 <button class="btn btn-sm btn-outline-danger btn-delete-listing">Delete</button>
             </div>
         `;
         listingContainer.insertBefore(card, addListingBtn);
         // Attach listeners after inserting
         card.querySelector('.btn-edit-listing').addEventListener('click', () => editListing(listingId, listingData));
         card.querySelector('.btn-delete-listing').addEventListener('click', () => deleteListing(listingId));
    } // End displayListingCard

    // --- Authentication State Change Listener ---
    auth.onAuthStateChanged(async user => {
        const isMerchantPage = window.location.pathname.includes('merchant.html'); // Ensure this runs only on merchant page effectively
        if (!isMerchantPage) return; // Exit if not on merchant page

        const currentMsgEl = document.querySelector('.merchant-section .not-merchant-message');
        const startSellingBtn = document.querySelector('.merchant-section .btn-orange');

        if (user) {
            const userDocRef = db.collection('users').doc(user.uid);
            try {
                const userDoc = await userDocRef.get();
                if (userDoc.exists && userDoc.data().accountType === 'Merchant') {
                    console.log("Merchant page: User is a Merchant.");
                    // Remove non-merchant message if it exists
                    if(currentMsgEl) currentMsgEl.remove();
                    // Load data and setup forms
                    loadMerchantStores(user.uid); // Also populates dropdown
                    loadMerchantListings(user.uid);
                    setupStoreForm(user.uid);
                    setupListingForm(user.uid);
                    // Ensure sections are visible
                    document.querySelectorAll('#stores, #listings').forEach(el => el.style.display = 'block');
                    if (startSellingBtn) startSellingBtn.style.display = 'inline-block';
                } else {
                    console.log("Merchant page: User is NOT a Merchant.");
                    displayNotMerchantMessage(); // Show message and hide sections
                }
            } catch (error) {
                console.error("Error fetching user data in auth change:", error);
                displayNotMerchantMessage("Error checking account type.");
            }
        } else {
             console.log("Merchant page: User signed out.");
            displayNotMerchantMessage("Please sign in as a Merchant to access this page.");
        }
    }); // End auth.onAuthStateChanged

}); // End DOMContentLoaded