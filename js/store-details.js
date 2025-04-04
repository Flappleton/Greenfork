// js/store-details.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Store Details script loaded.");

    // Ensure Firebase services are available
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
        console.error("Firebase auth or db not initialized for store-details.js");
        displayError("Error connecting to services. Please refresh.");
        return;
    }

    // --- DOM References ---
    const storeNameEl = document.getElementById('storeName');
    const storeLocationEl = document.getElementById('storeLocation');
    const storeDescriptionEl = document.getElementById('storeDescription');
    const storeListingsGrid = document.getElementById('storeListingsGrid');
    const storeListingsHeading = document.getElementById('storeListingsHeading'); // h2 for listings

    // --- Helper Functions ---
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "&quot;").replace(/'/g, "'");
    }

    // Reuse card creation function (needs to be defined here or in a shared utils.js)
    function createStoreListingCard(listingData, listingId) {
        const card = document.createElement('div');
        card.className = 'listing-card'; // Use styles defined in store-details.html
        card.setAttribute('data-id', listingId);

        const priceString = listingData.price === 0 ? 'FREE (Donation)' : `₹${listingData.price}`;
        const originalPriceString = listingData.originalPrice ? `<span class="text-sm line-through text-muted">₹${listingData.originalPrice}</span>` : '';
        const placeholderColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        let emoji = '📦';
        if (listingData.foodType === 'Bakery') emoji = '🥐';
        else if (listingData.foodType === 'Fresh') emoji = '🍎';
        else if (listingData.foodType === 'Leftovers') emoji = '🍲';
        else if (listingData.foodType === 'Packaged') emoji = '🥫';

        card.innerHTML = `
            <div class="listing-card-img" style="background-color: ${placeholderColor}; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: white;">
                 ${emoji}
            </div>
            <div class="listing-card-body">
                <h5>${escapeHtml(listingData.listingName)}</h5>
                <!-- Store name omitted on store page -->
                <p class="details">Qty: ${escapeHtml(listingData.quantity)}</p>
                ${listingData.expiryDate ? `<p class="details"><small>Best Before: ${listingData.expiryDate}</small></p>` : ''}
                ${listingData.description ? `<p class="details description-clamp">${escapeHtml(listingData.description)}</p>`: ''}
            </div>
            <div class="listing-card-footer">
                <span class="price">${priceString} ${originalPriceString}</span>
                <button class="btn-request btn btn-sm" data-id="${listingId}">Request</button>
            </div>
        `;
        const descEl = card.querySelector('.description-clamp');
        if(descEl) { /* Apply clamping style */
             descEl.style.display = '-webkit-box'; descEl.style.webkitLineClamp = '2';
             descEl.style.webkitBoxOrient = 'vertical'; descEl.style.overflow = 'hidden';
             descEl.style.textOverflow = 'ellipsis'; descEl.style.marginBottom = '0.5rem';
        }

        card.querySelector('.btn-request').addEventListener('click', () => {
            console.log(`Request button clicked for listing: ${listingId}`, listingData);
            alert(`Requesting: ${listingData.listingName}\n(Full request functionality coming soon!)`);
        });
        return card;
    } // End createStoreListingCard


    function displayError(message, isListingError = false) {
        if (isListingError) {
            if(storeListingsGrid) storeListingsGrid.innerHTML = `<p class="error-message col-span-full">${escapeHtml(message)}</p>`;
        } else {
            // Display general page error (e.g., store not found)
             if(storeNameEl) storeNameEl.textContent = 'Error';
             if(storeLocationEl) storeLocationEl.textContent = escapeHtml(message);
             if(storeDescriptionEl) storeDescriptionEl.textContent = '';
             if(storeListingsGrid) storeListingsGrid.innerHTML = ''; // Clear listings area too
             if(storeListingsHeading) storeListingsHeading.style.display = 'none'; // Hide listing heading
        }
    }

    // --- Get Store ID from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const storeId = urlParams.get('storeId');

    if (!storeId) {
        displayError("No store ID provided in the URL.");
        return;
    }
    console.log("Loading details for store ID:", storeId);

    // --- Function to Load Store Details ---
    async function loadStoreDetails() {
         if (!storeNameEl || !storeLocationEl || !storeDescriptionEl) return; // Exit if header elements missing

         try {
            const storeRef = db.collection('stores').doc(storeId);
            const doc = await storeRef.get();

            if (doc.exists) {
                const storeData = doc.data();
                console.log("Store data:", storeData);
                // Populate the header section
                document.title = `${storeData.storeName} - GreenFork`; // Update page title
                storeNameEl.textContent = escapeHtml(storeData.storeName);
                storeLocationEl.innerHTML = storeData.location ? `<i class="fas fa-map-marker-alt fa-fw"></i> ${escapeHtml(storeData.location)}` : 'Location not specified';
                storeDescriptionEl.textContent = escapeHtml(storeData.description || ''); // Show description if available

                 // Update the listing section header
                 if(storeListingsHeading) storeListingsHeading.textContent = `Available Listings from ${escapeHtml(storeData.storeName)}`;

            } else {
                console.log("No such store found!");
                displayError("Store not found.");
            }
         } catch (error) {
            console.error("Error getting store details:", error);
            displayError("Error loading store details.");
         }
    } // End loadStoreDetails

    // --- Function to Load Listings for THIS Store ---
    async function loadStoreListings() {
        if (!storeListingsGrid) return;
        storeListingsGrid.innerHTML = '<p class="loading-message col-span-full">Loading listings...</p>'; // Show loading message

        try {
            const listingsRef = db.collection('listings');
            // Query for available items specifically from this store
            const query = listingsRef.where('storeId', '==', storeId)
                                     .where('status', '==', 'Available')
                                     .orderBy('createdAt', 'desc');
            const snapshot = await query.get();

             storeListingsGrid.innerHTML = ''; // Clear loading message before adding cards

            if (snapshot.empty) {
                console.log("No available listings found for this store.");
                storeListingsGrid.innerHTML = '<p class="no-listings-message col-span-full">No available listings from this store currently.</p>';
            } else {
                console.log(`Found ${snapshot.docs.length} available listings for this store.`);
                snapshot.forEach(doc => {
                    const card = createStoreListingCard(doc.data(), doc.id); // Reuse card creation logic
                    storeListingsGrid.appendChild(card);
                });
            }

        } catch (error) {
            console.error("Error loading store listings:", error);
            displayError("Error loading listings for this store.", true); // Mark as listing error
             // Check for index errors
             if (error.code === 'failed-precondition') {
                  console.warn("Firestore query requires an index for store listings (storeId == X, status == Available, orderBy createdAt). Check error details for link.");
                  storeListingsGrid.innerHTML += `<p class="text-warning small text-center col-span-full p-2">(Loading failed: A database index is required. See console for link.)</p>`;
             }
        }
    } // End loadStoreListings

    // --- Initial Load ---
    loadStoreDetails(); // Load store info first
    loadStoreListings(); // Then load store listings

    // Note: Auth listener usually not needed here unless restricting access

}); // End DOMContentLoaded