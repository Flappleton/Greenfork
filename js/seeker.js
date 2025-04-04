// js/seeker.js - Simplified: Loads all available, includes client-side search ONLY

document.addEventListener('DOMContentLoaded', () => {
    console.log("Seeker script loaded (Simplified).");

    // Ensure Firebase services are available
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
        console.error("Firebase auth or db not initialized for seeker.js");
        hideListingSectionsOnError("Error connecting to services. Please refresh.");
        return;
    }

    // --- DOM References ---
    const vegListingsContainer = document.getElementById('vegListingsContainer');
    const noVegListingsMsg = document.getElementById('noVegListings');
    const nonVegListingsContainer = document.getElementById('nonVegListingsContainer');
    const noNonVegListingsMsg = document.getElementById('noNonVegListings');
    const storesContainer = document.getElementById('storesContainer');
    const noStoresMsg = document.getElementById('noStores');
    const searchInput = document.getElementById('searchInput');
    // Keep Filter Button reference if you want it to just exist, but it won't do much
    const filterBtn = document.getElementById('filterBtn');
    // Modal references removed as we aren't using the modal logic now

    // --- Helper Functions ---
     function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "&quot;").replace(/'/g, "'");
    }

    function hideListingSectionsOnError(message = "Could not load listings.") {
        if (vegListingsContainer) vegListingsContainer.innerHTML = `<p class="text-danger text-center p-3">${message}</p>`;
        if (nonVegListingsContainer) nonVegListingsContainer.innerHTML = `<p class="text-danger text-center p-3">${message}</p>`;
        if (storesContainer) storesContainer.innerHTML = `<p class="text-danger text-center p-3">Could not load stores.</p>`;
        if (noVegListingsMsg) noVegListingsMsg.style.display = 'none';
        if (noNonVegListingsMsg) noNonVegListingsMsg.style.display = 'none';
       if (noStoresMsg) noStoresMsg.style.display = 'none';
    }

    // --- Function to Create Listing Card HTML (Unchanged) ---
    function createSeekerListingCard(listingData, listingId) {
        const card = document.createElement('div');
        card.className = 'listing-card';
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
                <p class="store-name">From: ${escapeHtml(listingData.storeName)}</p>
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
        if(descEl) { /* Apply clamping style */ } // Style details omitted for brevity

        card.querySelector('.btn-request').addEventListener('click', () => {
            console.log(`Request button clicked for listing: ${listingId}`, listingData);
            alert(`Requesting: ${listingData.listingName}\n(Full request functionality coming soon!)`);
        });
        return card;
    } // End createSeekerListingCard

    // --- Function to Filter Cards Client-Side (for Search - unchanged) ---
    function filterCardsBySearch(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
        const allListingCards = document.querySelectorAll('#vegListingsContainer .listing-card, #nonVegListingsContainer .listing-card');
        const allStoreCards = document.querySelectorAll('#storesContainer .store-card'); // Keep for future store search

        let vegVisible = false; let nonVegVisible = false; let storesVisible = false;

        allListingCards.forEach(card => { /* ... same logic ... */ });
        allStoreCards.forEach(card => { /* ... same logic ... */ });

        if (noVegListingsMsg) noVegListingsMsg.style.display = vegVisible ? 'none' : 'block';
        if (noNonVegListingsMsg) noNonVegListingsMsg.style.display = nonVegVisible ? 'none' : 'block';
        if (noStoresMsg) noStoresMsg.style.display = storesVisible ? 'none' : 'block';
    } // End filterCardsBySearch

    // --- Function to Load Available Food Listings (Simplified - no filters parameter) ---
    async function loadAvailableFoodListings() {
        if (!vegListingsContainer || !nonVegListingsContainer || !noVegListingsMsg || !noNonVegListingsMsg) { return; }
        vegListingsContainer.innerHTML = ''; nonVegListingsContainer.innerHTML = '';
        noVegListingsMsg.style.display = 'block'; noNonVegListingsMsg.style.display = 'block';
        let vegFound = false; let nonVegFound = false;

        console.log("Loading available FOOD listings (status: Available)...");

        try {
            const listingsRef = db.collection('listings');
            // Simple query: Get available items, newest first
            const query = listingsRef.where('status', '==', 'Available')
                                     .orderBy('createdAt', 'desc');
            const snapshot = await query.get();

            if (snapshot.empty) {
                 console.log('No available food listings found.');
            } else {
                 console.log(`Found ${snapshot.docs.length} available food listings.`);
                 snapshot.forEach(doc => {
                     const listingData = doc.data();
                     const listingId = doc.id;
                     const cardElement = createSeekerListingCard(listingData, listingId);
                     if (listingData.dietaryPref === 'Vegetarian' || listingData.dietaryPref === 'Vegan') {
                         vegListingsContainer.appendChild(cardElement); vegFound = true;
                     } else {
                         nonVegListingsContainer.appendChild(cardElement); nonVegFound = true;
                     }
                 });
            }
        } catch (error) {
            console.error("Error loading available food listings: ", error);
            hideListingSectionsOnError("Error loading food listings. Please try refreshing.");
             // Still check for index error on the *base* query
             if (error.code === 'failed-precondition') {
                  console.warn("Firestore query requires an index (status == Available, orderBy createdAt). Check error details for link.");
                  // Update UI error message if needed
             }
        } finally {
            if (noVegListingsMsg) noVegListingsMsg.style.display = vegFound ? 'none' : 'block';
            if (noNonVegListingsMsg) noNonVegListingsMsg.style.display = nonVegFound ? 'none' : 'block';
            if(noVegListingsMsg && !vegFound) noVegListingsMsg.textContent = "No vegetarian listings found currently.";
            if(noNonVegListingsMsg && !nonVegFound) noNonVegListingsMsg.textContent = "No non-vegetarian listings found currently.";
        }
    } // End loadAvailableFoodListings

    // --- Event Listeners ---

    // 1. Search Input Listener (Client-side filtering)
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterCardsBySearch(e.target.value); // Filter currently displayed cards
        });
    }

    // 2. Filter Button Listener (Does nothing for now, could be removed or left as UI element)
     if (filterBtn) {
         filterBtn.addEventListener('click', () => {
             console.log("Filter button clicked (functionality deferred).");
             alert("Advanced filtering options will be added later!");
             // const filterModal = bootstrap.Modal.getInstance(document.getElementById('filterModal'));
             // if (filterModal) filterModal.show(); // Could still open modal if HTML exists, but Apply button won't query
         });
     }

    // --- Initial Load ---
    loadAvailableFoodListings(); // Load default view on page load

    // --- Authentication Listener (Unchanged) ---
    auth.onAuthStateChanged(user => { /* ... same as before ... */ });

    // TODO: Add logic to load stores (Step 8)

}); // End DOMContentLoaded