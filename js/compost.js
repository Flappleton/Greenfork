// js/compost.js - REVISED with Initialized Guard

// Guard flag to prevent running initialization logic more than once
let isCompostScriptInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    // --- Initialization Guard ---
    if (isCompostScriptInitialized) {
        console.log("Compost script already initialized. Skipping redundant setup.");
        return; // Exit if already run
    }
    isCompostScriptInitialized = true; // Set the flag
    console.log("Running Compost script initialization...");

    // Ensure Firebase services are available
    if (typeof firebase === 'undefined' || typeof auth === 'undefined' || typeof db === 'undefined') {
        console.error("Firebase auth or db not initialized for compost.js");
        hideFormAndListOnError("Error connecting to services. Please refresh.");
        return;
    }

    // --- Firestore Reference ---
    const compostPoolRef = db.collection('compostPool'); // <-- Use separate collection

    // --- DOM References ---
    // Defined within the listener scope, should be fine unless the listener runs twice WITHOUT the guard
    const poolingForm = document.getElementById('poolingForm');
    const foodTypeSelect = document.getElementById('compostFoodType');
    const quantityInput = document.getElementById('compostQuantity');
    const notesInput = document.getElementById('compostNotes');
    const formErrorDiv = document.getElementById('poolingFormError');
    const poolingListDiv = document.getElementById('poolingList');
    const noCompostItemsMsg = document.getElementById('noCompostItems');
    const submitButton = poolingForm ? poolingForm.querySelector('button[type="submit"]') : null;

    // --- Helper Functions ---
     function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "&quot;").replace(/'/g, "'");
    }

    function hideFormAndListOnError(message = "Could not load compost data.") {
        if (poolingForm) poolingForm.style.display = 'none';
        if (poolingListDiv) poolingListDiv.innerHTML = `<p class="text-danger text-center p-3">${message}</p>`;
        if (noCompostItemsMsg) noCompostItemsMsg.style.display = 'none';
    }

    function displayFormError(message) {
        if (formErrorDiv) {
            formErrorDiv.textContent = message;
            formErrorDiv.style.display = message ? 'block' : 'none';
        }
    }

    // --- Form Submission Handler ---
    if (poolingForm && submitButton && foodTypeSelect && quantityInput && notesInput) {
        poolingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            displayFormError('');

            const user = auth.currentUser;
            if (!user) {
                displayFormError('Please sign in to add items for composting.');
                try {
                    const signInModalEl = document.getElementById('signInModal');
                    if (signInModalEl) { (bootstrap.Modal.getInstance(signInModalEl) || new bootstrap.Modal(signInModalEl)).show(); }
                } catch (modalError) { console.error("Error showing sign-in modal:", modalError); }
                return;
            }

            const foodType = foodTypeSelect.value;
            const quantity = quantityInput.value.trim();
            const notes = notesInput.value.trim();

            if (!foodType || !quantity) {
                displayFormError('Food Type and Quantity are required.');
                return;
            }

            const compostItemData = {
                userId: user.uid,
                donorEmail: user.email || 'N/A',
                foodType: foodType,
                quantity: quantity,
                notes: notes || 'No additional notes.',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                // status: 'Available' // Add status if needed for compost workflow
            };

            console.log("Attempting to add item to 'compostPool' collection:", compostItemData);
            submitButton.disabled = true;

            try {
                const docRef = await compostPoolRef.add(compostItemData);
                console.log("Compost item added successfully to compostPool with ID:", docRef.id);
                poolingForm.reset();
                displayPoolItems(); // Refresh list

            } catch (error) {
                console.error('Error adding compost item:', error);
                displayFormError(`Error adding item: ${error.message}`);
            } finally {
                 submitButton.disabled = false;
            }
        });
    } else {
         console.warn("Compost pooling form or one of its required elements not found.");
         if(poolingForm) poolingForm.style.display = 'none';
    }

    // --- Function to Display Compost Pool Items ---
    async function displayPoolItems() {
        if (!poolingListDiv || !noCompostItemsMsg) return;

        poolingListDiv.innerHTML = '';
        noCompostItemsMsg.style.display = 'block';
        let itemsFound = false;

        console.log("Loading items from 'compostPool' collection...");

        try {
            const query = compostPoolRef.orderBy('createdAt', 'desc').limit(50);
            const snapshot = await query.get();

            if (snapshot.empty) {
                console.log('No compost items found in compostPool.');
            } else {
                itemsFound = true;
                console.log(`Found ${snapshot.docs.length} compost items in compostPool.`);
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const poolItem = document.createElement('div');
                    poolItem.className = 'pool-item';

                    let dateString = 'Date unknown';
                    if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                         try { dateString = data.createdAt.toDate().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }); }
                         catch (dateError) { console.warn("Error formatting date", dateError); }
                    }

                    poolItem.innerHTML = `
                        <h3>${escapeHtml(data.foodType)}</h3>
                        <p><strong>Quantity:</strong> ${escapeHtml(data.quantity)}</p>
                        <p><strong>Notes:</strong> ${escapeHtml(data.notes)}</p>
                        <p class="timestamp"><small>Added: ${dateString}</small></p>
                        ${data.donorEmail ? `<p class="donor-info"><small>By: ${escapeHtml(data.donorEmail)}</small></p>` : ''}
                    `;
                    poolingListDiv.appendChild(poolItem);
                });
            }
        } catch (error) {
            console.error('Error getting compost pool items:', error);
            poolingListDiv.innerHTML = '<p class="text-center text-danger">Error loading compost pool items.</p>';
             if (error.code === 'failed-precondition') {
                 console.warn("Firestore query for compostPool requires an index (orderBy createdAt). Check the detailed error message for a creation link.");
                 poolingListDiv.innerHTML += '<p class="text-center text-warning small">(A database index might be required for compostPool - check console for details/link).</p>';
            }
        } finally {
            noCompostItemsMsg.style.display = itemsFound ? 'none' : 'block';
        }
    } // End displayPoolItems

    // --- Auth State Change Listener ---
    // No changes needed here, it already checks if it's the compost page
    auth.onAuthStateChanged((user) => {
        const isCompostPage = window.location.pathname.includes('compost.html');
        if (!isCompostPage) return;

        if (user) {
            console.log("Compost page: User logged in", user.uid);
            if (submitButton) submitButton.disabled = false;
            displayFormError('');
            displayPoolItems(); // Refresh list on login
        } else {
            console.log("Compost page: User logged out.");
            displayPoolItems(); // Still load public compost list
        }
    });

}); // End DOMContentLoaded