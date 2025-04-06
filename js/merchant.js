// js/merchant.js - Includes Geocoding and saves storeId/merchantId with listings

document.addEventListener('DOMContentLoaded', () => {
    console.log("Merchant script initializing (v_final_geocode)...");

    // --- Firebase Check ---
    let db;
    let auth;
    let isFirebaseMerchantReady = false;

    function checkFirebaseServices() {
        if (typeof window.auth !== 'undefined' && typeof window.db !== 'undefined') {
            console.log("Merchant: Firebase services ready.");
            db = window.db;
            auth = window.auth;
            isFirebaseMerchantReady = true;
            setupFirebaseAuthListener_Merchant(); // Setup listener now that auth is ready
        } else {
            console.warn("Merchant: Firebase not ready, retrying...");
            setTimeout(checkFirebaseServices, 300); // Retry
        }
    }

    // --- DOM Element References ---
    // Store Section
    const storeContainer = document.getElementById('storeContainer');
    const addStoreBtn = document.getElementById('addStoreBtn');
    const storeModalEl = document.getElementById('storeModal');
    const storeModalInstance = storeModalEl ? new bootstrap.Modal(storeModalEl) : null;
    const storeForm = document.getElementById('storeForm');
    const storeFormError = document.getElementById('storeFormError');
    const storeNameInput = document.getElementById('storeName');
    const storeLocationInput = document.getElementById('storeLocation');
    const storeDescriptionInput = document.getElementById('storeDescription');
    // Geocoding Elements
    const geocodeBtn = document.getElementById('geocodeBtn');
    const geocodeStatus = document.getElementById('geocodeStatus');
    const storeLatInput = document.getElementById('storeLat'); // Hidden input
    const storeLonInput = document.getElementById('storeLon'); // Hidden input

    // Listing Section
    const listingContainer = document.getElementById('listingContainer');
    const addListingBtn = document.getElementById('addListingBtn');
    const listingModalEl = document.getElementById('listingModal');
    const listingModalInstance = listingModalEl ? new bootstrap.Modal(listingModalEl) : null;
    const listingForm = document.getElementById('listingForm');
    const listingFormError = document.getElementById('listingFormError');
    const listingStoreSelect = document.getElementById('listingStore');
    const listingFoodTypeSelect = document.getElementById('listingFoodType');
    const poolingOptionDiv = document.getElementById('poolingOptionDiv');
    const listingPoolingCheckbox = document.getElementById('listingPooling');

    // Other UI
    const merchantIntroSection = document.querySelector('.merchant-section');
    const storesSection = document.getElementById('stores');
    const listingsSection = document.getElementById('listings');
    const merchantMessageContainer = document.getElementById('merchantMessageContainer');
    const merchantActionBtnContainer = document.querySelector('.merchant-section .text-center.mt-4');

    // --- State Variable ---
    let merchantStores = []; // Cache for store dropdown {id, name}

    // --- Helper Functions ---
     function escapeHtml(unsafe) {
         if (typeof unsafe !== 'string') return '';
         return unsafe
              .replace(/&/g, "&")
              .replace(/</g, "<")
              .replace(/>/g, ">")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "'");
     }

     function showToast(message, type = 'success') {
         const toastEl = document.getElementById('generalToast');
         const toastBody = document.getElementById('generalToastBody');
         if (!toastEl || !toastBody) { console.warn("Toast elements not found for message:", message); alert(`${type.toUpperCase()}: ${message}`); return; }
         toastBody.textContent = message;
         toastEl.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
         toastEl.classList.add(`bg-${type}`, 'text-white');
         try { const toast = bootstrap.Toast.getOrCreateInstance(toastEl); toast.show(); }
         catch (e) { console.error("Bootstrap toast error", e)}
     }

     function displayMerchantMessage(message = "You must be logged in as a Merchant.", type = 'warning') {
          let msgContainer = document.getElementById('merchantMessageContainer');
          if (!msgContainer && merchantIntroSection?.querySelector('.container')) {
              msgContainer = document.createElement('div'); msgContainer.id = 'merchantMessageContainer';
              merchantIntroSection.querySelector('.container').prepend(msgContainer);
          }
          if (msgContainer) {
               msgContainer.innerHTML = '';
               const msgElement = document.createElement('div');
               msgElement.className = `alert alert-${type} mt-4 not-merchant-message`;
               msgElement.textContent = message;
               msgContainer.appendChild(msgElement);
          } else { console.error("Cannot find container for merchant message"); }
          if(storesSection) storesSection.style.display = 'none';
          if(listingsSection) listingsSection.style.display = 'none';
          if (merchantActionBtnContainer) merchantActionBtnContainer.style.display = 'none';
     }

     function clearMerchantMessage() {
          const msgContainer = document.getElementById('merchantMessageContainer');
          if (msgContainer) msgContainer.innerHTML = '';
     }

    // --- Geocoding Function ---
     async function geocodeAddress() {
         if (!storeLocationInput || !geocodeStatus || !storeLatInput || !storeLonInput || !geocodeBtn) { console.error("Geocode elements missing"); return; }
         const address = storeLocationInput.value.trim();
         if (!address) { geocodeStatus.textContent = 'Please enter an address.'; geocodeStatus.className = 'form-text text-danger d-block mt-1'; return; }
         geocodeStatus.textContent = 'Finding coordinates...'; geocodeStatus.className = 'form-text text-muted d-block mt-1';
         geocodeBtn.disabled = true;
         // **IMPORTANT: REPLACE WITH YOUR EMAIL FOR NOMINATIM POLICY**
         const yourEmail = 'vscodesh@gmail.com'; // <<<--- CHANGE THIS
         const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&email=${yourEmail}`;
         try {
             const response = await fetch(url); if (!response.ok) throw new Error(`Nominatim failed: ${response.statusText}`);
             const data = await response.json();
             if (data?.length > 0) {
                 const r = data[0]; const lat = parseFloat(r.lat).toFixed(6); const lon = parseFloat(r.lon).toFixed(6);
                 storeLatInput.value = lat; storeLonInput.value = lon;
                 geocodeStatus.textContent = `Coordinates Found: ${lat}, ${lon}`; geocodeStatus.className = 'form-text text-success d-block mt-1';
             } else { storeLatInput.value = ''; storeLonInput.value = ''; geocodeStatus.textContent = 'Could not find coordinates for this address.'; geocodeStatus.className = 'form-text text-warning d-block mt-1'; }
         } catch (error) { console.error("Geocoding error:", error); storeLatInput.value = ''; storeLonInput.value = ''; geocodeStatus.textContent = `Error finding coordinates: ${error.message}`; geocodeStatus.className = 'form-text text-danger d-block mt-1'; }
         finally { geocodeBtn.disabled = false; }
     }
     if (geocodeBtn) geocodeBtn.addEventListener('click', geocodeAddress);


    // --- Store Loading and Display ---
    async function loadMerchantStores(merchantId) {
        if (!isFirebaseMerchantReady || !db || !storeContainer || !addStoreBtn) return;
        storeContainer.querySelectorAll('.store-card, .no-stores-message, .error-loading-stores').forEach(el => el.remove());
        merchantStores = [];
        console.log(`Loading stores for merchant: ${merchantId}`);
        try {
            const query = db.collection('stores').where('merchantId', '==', merchantId).orderBy('createdAt', 'desc');
            const snapshot = await query.get();
            if (snapshot.empty) {
                const noStoresMsg = document.createElement('p'); noStoresMsg.textContent = 'No stores added yet.';
                noStoresMsg.className = 'text-muted ms-3 no-stores-message'; addStoreBtn.insertAdjacentElement('afterend', noStoresMsg);
            } else {
                snapshot.forEach(doc => { const d=doc.data(); if (d.storeName){merchantStores.push({id:doc.id, name:d.storeName});} displayStoreCard(d, doc.id); });
            }
            populateStoreDropdown();
        } catch (error) { /* Error handling */ console.error("Error loading stores:", error); }
    }

    function displayStoreCard(storeData, storeId) {
         if (!storeContainer || !addStoreBtn) return;
         const card = document.createElement('div'); card.className = 'store-card'; card.setAttribute('data-id', storeId);
         card.innerHTML = `<h3>${escapeHtml(storeData.storeName || 'N/A')}</h3><p><strong>Location:</strong> ${escapeHtml(storeData.location || 'N/A')}</p>${storeData.description ? `<p><em>${escapeHtml(storeData.description)}</em></p>` : ''}${(storeData.latitude && storeData.longitude) ? `<p><small><i class="fas fa-map-marked-alt text-success"></i> Coords Saved</small></p>` : '<p><small class="text-warning"><i class="fas fa-exclamation-triangle"></i> Coords Missing</small></p>'}<button class="btn btn-sm btn-outline-secondary mt-2 btn-edit-store">Edit</button> <button class="btn btn-sm btn-outline-danger mt-2 btn-delete-store">Delete</button>`;
         storeContainer.insertBefore(card, addStoreBtn);
         // Attach listeners ensuring functions exist globally
         card.querySelector('.btn-edit-store').addEventListener('click', () => { if(typeof window.editStore === 'function') window.editStore(storeId, storeData); else console.error('editStore not global'); });
         card.querySelector('.btn-delete-store').addEventListener('click', () => { if(typeof window.deleteStore === 'function') window.deleteStore(storeId); else console.error('deleteStore not global'); });
    }

    function populateStoreDropdown() {
        if (!listingStoreSelect) return;
        const currentVal = listingStoreSelect.value;
        listingStoreSelect.innerHTML = '<option value="" disabled selected>-- Select your store --</option>';
        merchantStores.forEach(store => { const opt = document.createElement('option'); opt.value = store.id; opt.textContent = escapeHtml(store.name); if(store.id === currentVal) opt.selected = true; listingStoreSelect.appendChild(opt); });
    }

    // --- Store Form, Edit, Delete Setup ---
    function setupStoreForm(merchantId) {
        if (!isFirebaseMerchantReady || !db || !storeForm || !storeModalInstance) return;
        let editingStoreId = null;

        storeForm.addEventListener('submit', async (e) => {
             e.preventDefault(); if (storeFormError) storeFormError.textContent = '';
             const storeName = storeNameInput?.value.trim(); const storeLocation = storeLocationInput?.value.trim();
             const storeDescription = storeDescriptionInput?.value.trim();
             let latitude = storeLatInput?.value ? parseFloat(storeLatInput.value) : null;
             let longitude = storeLonInput?.value ? parseFloat(storeLonInput.value) : null;
             if (!storeName || !storeLocation) { if (storeFormError) storeFormError.textContent = 'Store Name and Address required.'; return; }
             if ((storeLatInput?.value || storeLonInput?.value) && (isNaN(latitude) || isNaN(longitude))) { if (storeFormError) storeFormError.textContent = 'Warning: Invalid coordinates. Coordinates will not be saved.'; latitude = null; longitude = null; }
             const storeDataToSave = { merchantId, storeName, location: storeLocation, description: storeDescription, latitude, longitude };
             const submitButton = storeForm.querySelector('button[type="submit"]');
             try {
                 if(submitButton) submitButton.disabled = true;
                 if (editingStoreId) { await db.collection('stores').doc(editingStoreId).update({...storeDataToSave, updatedAt: firebase.firestore.FieldValue.serverTimestamp()}); showToast("Store updated!", "success"); }
                 else { storeDataToSave.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection('stores').add(storeDataToSave); showToast("Store added!", "success"); }
                 storeForm.reset(); editingStoreId = null;
                 if(geocodeStatus) { geocodeStatus.textContent = 'Enter address...'; geocodeStatus.className = 'form-text text-muted d-block mt-1'; }
                 if(storeLatInput) storeLatInput.value = ''; if(storeLonInput) storeLonInput.value = '';
                 storeModalInstance.hide(); loadMerchantStores(merchantId);
             } catch (error) { console.error("Error saving store: ", error); if (storeFormError) storeFormError.textContent = `Error: ${error.message}`; showToast("Error saving store.", "danger"); }
              finally { if(submitButton) submitButton.disabled = false; }
         });

        // Make editStore global
         window.editStore = (storeId, storeData) => {
             console.log(`Editing store: ${storeId}`); editingStoreId = storeId;
             if(storeNameInput) storeNameInput.value = storeData.storeName || '';
             if(storeLocationInput) storeLocationInput.value = storeData.location || '';
             if(storeDescriptionInput) storeDescriptionInput.value = storeData.description || '';
             if(storeLatInput) storeLatInput.value = storeData.latitude || '';
             if(storeLonInput) storeLonInput.value = storeData.longitude || '';
             if(geocodeStatus) { if(storeData.latitude && storeData.longitude) { geocodeStatus.textContent = `Coords: ${storeData.latitude}, ${storeData.longitude}`; geocodeStatus.className = 'form-text text-success d-block mt-1'; } else { geocodeStatus.textContent = 'No coords saved.'; geocodeStatus.className = 'form-text text-warning d-block mt-1'; } }
             const modalTitle = document.getElementById('storeModalLabel'); if (modalTitle) modalTitle.textContent = 'Edit Store';
             if(storeModalInstance) storeModalInstance.show();
         };

        // Make deleteStore global
         window.deleteStore = async (storeId) => {
             if (!isFirebaseMerchantReady || !db || !auth?.currentUser) return;
             if (!confirm('Delete this store and ALL its listings?')) return;
             const currentMerchantId = auth.currentUser.uid;
             try {
                 const storeDoc = await db.collection('stores').doc(storeId).get();
                 if (!storeDoc.exists || storeDoc.data().merchantId !== currentMerchantId) { throw new Error("Permission denied or store not found."); }
                 const listingsQuery = db.collection('listings').where('storeId', '==', storeId).where('merchantId', '==', currentMerchantId);
                 const listingsSnapshot = await listingsQuery.get();
                 const batch = db.batch();
                 if (!listingsSnapshot.empty) { listingsSnapshot.docs.forEach(doc => batch.delete(doc.ref)); }
                 batch.delete(db.collection('stores').doc(storeId));
                 await batch.commit(); showToast("Store and listings deleted.", "success");
                 loadMerchantStores(currentMerchantId); loadMerchantListings(currentMerchantId);
             } catch (error) { console.error("Error deleting store:", error); alert(`Error: ${error.message}`); showToast("Error deleting store.", "danger"); }
         };

        // Modal close listener
        if(storeModalEl) storeModalEl.addEventListener('hidden.bs.modal', () => {
             editingStoreId = null; storeForm.reset(); if (storeFormError) storeFormError.textContent = '';
             const modalTitle = document.getElementById('storeModalLabel'); if (modalTitle) modalTitle.textContent = 'Add New Store';
             if(storeLatInput) storeLatInput.value = ''; if(storeLonInput) storeLonInput.value = '';
             if(geocodeStatus) { geocodeStatus.textContent = 'Enter address...'; geocodeStatus.className = 'form-text text-muted d-block mt-1'; }
        });
    } // End setupStoreForm

    // --- Listing Loading and Display ---
     async function loadMerchantListings(merchantId) {
         if (!isFirebaseMerchantReady || !db || !listingContainer || !addListingBtn) return;
         listingContainer.querySelectorAll('.listing-card, .no-listings-message, .error-loading-listings').forEach(el => el.remove());
         console.log(`Loading listings for merchant: ${merchantId}`);
         try {
             const query = db.collection('listings').where('merchantId', '==', merchantId).orderBy('createdAt', 'desc');
             const snapshot = await query.get();
             if (snapshot.empty) { /* Show 'no listings' message */ }
             else { snapshot.forEach(doc => displayListingCard(doc.data(), doc.id)); }
         } catch (error) { /* Error handling */ console.error("Error loading listings", error);}
     }

    function displayListingCard(listingData, listingId) {
         if (!listingContainer || !addListingBtn) return;
         const card = document.createElement('div'); card.className = 'listing-card'; card.setAttribute('data-id', listingId);
         const priceString = listingData.price === 0 ? 'Donation' : `₹${listingData.price}`;
         const statusClass = listingData.status === 'Available' ? 'success' : (listingData.status === 'Reserved' || listingData.status === 'Sold' ? 'warning' : 'secondary');
         card.innerHTML = `<h3>${escapeHtml(listingData.listingName || 'N/A')}</h3><p><strong>Store:</strong> ${escapeHtml(listingData.storeName || 'N/A')}</p><p><strong>Type:</strong> ${escapeHtml(listingData.foodType)} | <strong>Qty:</strong> ${escapeHtml(listingData.quantity)}</p><p><strong>Price:</strong> ${priceString}</p><p><strong>Status:</strong> <span class="badge bg-${statusClass}">${escapeHtml(listingData.status)}</span></p>${listingData.expiryDate ? `<p><small>Expiry: ${listingData.expiryDate}</small></p>` : ''}<div class="mt-auto pt-2 text-center"><button class="btn btn-sm btn-outline-secondary btn-edit-listing">Edit</button><button class="btn btn-sm btn-outline-danger btn-delete-listing">Delete</button></div>`;
         listingContainer.insertBefore(card, addListingBtn);
         // Attach listeners using global functions
         card.querySelector('.btn-edit-listing').addEventListener('click', () => { if(typeof editListing === 'function') editListing(listingId, listingData); else console.error('editListing not defined globally');});
         card.querySelector('.btn-delete-listing').addEventListener('click', () => { if(typeof deleteListing === 'function') deleteListing(listingId); else console.error('deleteListing not defined globally');});
    }

    // --- Listing Form, Edit, Delete Setup ---
    function setupListingForm(merchantId) {
         if (!isFirebaseMerchantReady || !db || !listingForm || !listingModalInstance || !listingStoreSelect || !listingFoodTypeSelect || !poolingOptionDiv || !listingPoolingCheckbox) return;
         let editingListingId = null;

         listingFoodTypeSelect.addEventListener('change', (e) => { poolingOptionDiv.style.display = (e.target.value === 'Expired') ? 'block' : 'none'; if (e.target.value !== 'Expired') listingPoolingCheckbox.checked = false; });

        listingForm.addEventListener('submit', async (e) => {
             e.preventDefault(); if (listingFormError) listingFormError.textContent = '';
             const selectedStoreId = listingStoreSelect.value;
             const selectedStore = merchantStores.find(s => s.id === selectedStoreId);
             if (!selectedStore) { if (listingFormError) listingFormError.textContent = 'Please select store.'; return; }
             const selectedStoreName = selectedStore.name;

             // Get other form values safely
             const listingName = document.getElementById('listingName')?.value.trim();
             const foodType = listingFoodTypeSelect.value;
             const quantity = document.getElementById('listingQuantity')?.value.trim();
             const dietaryPref = document.getElementById('listingDietary')?.value;
             const expiryDate = document.getElementById('listingExpiry')?.value;
             const priceRaw = document.getElementById('listingPrice')?.value;
             const price = priceRaw !== '' ? parseFloat(priceRaw) : 0;
             const description = document.getElementById('listingDescription')?.value.trim();
             const isPoolingAllowed = listingPoolingCheckbox.checked;

             if (!listingName || !foodType || !quantity || isNaN(price) || price < 0) { if (listingFormError) listingFormError.textContent = 'Title, Type, Qty, Price required.'; return; }

             // ** Include merchantId, storeId, storeName **
             const listingData = {
                 merchantId, storeId: selectedStoreId, storeName: selectedStoreName,
                 listingName, foodType, quantity, dietaryPref, expiryDate: expiryDate || null, price, description,
                 isPoolingAllowed: (foodType === 'Expired') ? isPoolingAllowed : false, status: "Available",
             };
             const submitButton = listingForm.querySelector('button[type="submit"]');
             try {
                 if(submitButton) submitButton.disabled = true;
                 if (editingListingId) { await db.collection('listings').doc(editingListingId).update({...listingData, updatedAt: firebase.firestore.FieldValue.serverTimestamp()}); showToast("Listing updated!", "success"); }
                 else { listingData.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection('listings').add(listingData); showToast("Listing added!", "success"); }
                 listingForm.reset(); editingListingId = null; poolingOptionDiv.style.display = 'none';
                 listingModalInstance.hide(); loadMerchantListings(merchantId);
             } catch (error) { console.error("Error saving listing:", error); if (listingFormError) listingFormError.textContent = `Error: ${error.message}`; showToast("Error saving listing.", "danger"); }
              finally { if(submitButton) submitButton.disabled = false; }
         });

        // Make editListing global
         window.editListing = (listingId, listingData) => {
              console.log(`Editing listing: ${listingId}`); editingListingId = listingId;
              if(listingStoreSelect) listingStoreSelect.value = listingData.storeId || '';
              // Populate other fields...
              const nameInput=document.getElementById('listingName'); if(nameInput) nameInput.value=listingData.listingName||'';
              const foodTypeInput=document.getElementById('listingFoodType'); if(foodTypeInput){foodTypeInput.value=listingData.foodType||''; foodTypeInput.dispatchEvent(new Event('change'));}
              const quantityInput=document.getElementById('listingQuantity'); if(quantityInput) quantityInput.value=listingData.quantity||'';
              const dietaryInput=document.getElementById('listingDietary'); if(dietaryInput) dietaryInput.value=listingData.dietaryPref||'Any';
              const expiryInput=document.getElementById('listingExpiry'); if(expiryInput) expiryInput.value=listingData.expiryDate||'';
              const priceInput=document.getElementById('listingPrice'); if(priceInput) priceInput.value=listingData.price!==undefined?listingData.price:0;
              const descriptionInput=document.getElementById('listingDescription'); if(descriptionInput) descriptionInput.value=listingData.description||'';
              if(listingPoolingCheckbox&&listingData.foodType==='Expired'){listingPoolingCheckbox.checked=listingData.isPoolingAllowed||false;} else if(listingPoolingCheckbox){listingPoolingCheckbox.checked=false;}
              const modalTitle=document.getElementById('listingModalLabel'); if(modalTitle) modalTitle.textContent='Edit Listing';
              if(listingModalInstance) listingModalInstance.show();
          };

        // Make deleteListing global
         window.deleteListing = async (listingId) => {
              if (!isFirebaseMerchantReady || !db || !auth?.currentUser) return;
              console.log(`Deleting listing: ${listingId}`);
              if (!confirm('Delete this listing?')) return;
              const currentMerchantId = auth.currentUser.uid;
              try {
                  const listingDoc = await db.collection('listings').doc(listingId).get();
                  if (!listingDoc.exists || listingDoc.data().merchantId !== currentMerchantId) { throw new Error("Permission denied or listing not found."); }
                  await db.collection('listings').doc(listingId).delete();
                  showToast("Listing deleted.", "success"); loadMerchantListings(currentMerchantId);
              } catch (error) { console.error("Error deleting listing:", error); alert(`Error: ${error.message}`); showToast("Error deleting listing.", "danger");}
          };

        // Reset form on modal close
        if(listingModalEl) listingModalEl.addEventListener('hidden.bs.modal', () => {
             editingListingId = null; listingForm.reset(); if(listingFormError) listingFormError.textContent = '';
             poolingOptionDiv.style.display = 'none';
             const modalTitle = document.getElementById('listingModalLabel'); if (modalTitle) modalTitle.textContent = 'Add New Listing';
        });
    } // End setupListingForm


    // --- Firebase Auth State Change Listener ---
    function setupFirebaseAuthListener_Merchant() {
        if (!auth) { console.error("Auth service not ready for listener."); return; }
        auth.onAuthStateChanged(async user => {
             if (!window.location.pathname.includes('merchant.html')) return; // Check context
             clearMerchantMessage();
             const startBtnContainer = document.getElementById('merchantActionBtnContainer'); // Re-get reference

             if (user) {
                 const userDocRef = db.collection('users').doc(user.uid);
                 try {
                     const userDoc = await userDocRef.get();
                     if (userDoc.exists && userDoc.data().accountType === 'Merchant') {
                         console.log("Merchant page: User is a Merchant.");
                         // Load data and setup forms
                         if (typeof loadMerchantStores === 'function') loadMerchantStores(user.uid);
                         if (typeof loadMerchantListings === 'function') loadMerchantListings(user.uid);
                         if (typeof setupStoreForm === 'function') setupStoreForm(user.uid);
                         if (typeof setupListingForm === 'function') setupListingForm(user.uid);
                         if(storesSection) storesSection.style.display = 'block';
                         if(listingsSection) listingsSection.style.display = 'block';
                         if(startBtnContainer) startBtnContainer.style.display = 'none'; // Hide sign-up prompt
                     } else { displayMerchantMessage("Only Merchants can access this page."); }
                 } catch (error) { console.error("Error fetching user data:", error); displayMerchantMessage("Error checking account type.", "danger"); }
             } else { displayMerchantMessage("Please sign in as a Merchant.", "info"); }
         });
    }

    // --- Start Initialization ---
    checkFirebaseServices(); // Start checking for Firebase readiness

}); // End DOMContentLoaded