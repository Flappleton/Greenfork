// js/seeker.js - Includes loading nearby stores

document.addEventListener('DOMContentLoaded', () => {
    console.log("Seeker script loaded.");

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
    const storesContainer = document.getElementById('storesContainer'); // Stores section
    const noStoresMsg = document.getElementById('noStores');           // Placeholder for stores

    // Filter Bar Elements
    const searchInput = document.getElementById('searchInput');
    const locationInput = document.getElementById('locationInput'); // Placeholder for now
    const radiusSelect = document.getElementById('radiusSelect');   // Placeholder for now
    const filterBtn = document.getElementById('filterBtn');
    // Filter Modal related elements removed as filtering was reverted

    // --- Helper Functions ---
     function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "&quot;").replace(/'/g, "'");
    }

    function hideListingSectionsOnError(message = "Could not load data.") {
        if (vegListingsContainer) vegListingsContainer.innerHTML = `<p class="text-danger text-center p-3">${message}</p>`;
        if (nonVegListingsContainer) nonVegListingsContainer.innerHTML = `<p class="text-danger text-center p-3">${message}</p>`;
        if (storesContainer) storesContainer.innerHTML = `<p class="text-danger text-center p-3">${message}</p>`; // Clear stores too on error
        // Ensure placeholder messages are hidden when error occurs
        if (noVegListingsMsg) noVegListingsMsg.style.display = 'none';
        if (noNonVegListingsMsg) noNonVegListingsMsg.style.display = 'none';
        if (noStoresMsg) noStoresMsg.style.display = 'none';
    }

    // --- Function to Create Listing Card HTML (for seeker page) ---
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
        if(descEl) {
            descEl.style.display = '-webkit-box'; descEl.style.webkitLineClamp = '2';
            descEl.style.webkitBoxOrient = 'vertical'; descEl.style.overflow = 'hidden';
            descEl.style.textOverflow = 'ellipsis'; descEl.style.marginBottom = '0.5rem';
        }

        card.querySelector('.btn-request').addEventListener('click', () => {
            console.log(`Request button clicked for listing: ${listingId}`, listingData);
            alert(`Requesting: ${listingData.listingName}\n(Full request functionality coming soon!)`);
        });
        return card;
    } // End createSeekerListingCard

    // --- Function to Filter Cards Client-Side (for Search) ---
    function filterCardsBySearch(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
        const allListingCards = document.querySelectorAll('#vegListingsContainer .listing-card, #nonVegListingsContainer .listing-card');
        const allStoreCards = document.querySelectorAll('#storesContainer .store-listing-card'); // Match class used below

        let vegVisible = false; let nonVegVisible = false; let storesVisible = false;

        allListingCards.forEach(card => {
            const cardText = card.textContent.toLowerCase();
            const isMatch = cardText.includes(lowerCaseSearchTerm);
            card.style.display = isMatch ? 'flex' : 'none';
            if (isMatch) {
                const parentContainer = card.closest('.horizontal-scroll-container');
                if (parentContainer) {
                    if (parentContainer.id === 'vegListingsContainer') vegVisible = true;
                    if (parentContainer.id === 'nonVegListingsContainer') nonVegVisible = true;
                }
            }
        });
         // Filter Store Cards
         allStoreCards.forEach(card => {
             const cardText = card.textContent.toLowerCase();
             const isMatch = cardText.includes(lowerCaseSearchTerm);
             card.style.display = isMatch ? 'flex' : 'none'; // Make sure display: flex matches card style
             if(isMatch) storesVisible = true;
         });

        if (noVegListingsMsg) noVegListingsMsg.style.display = vegVisible ? 'none' : 'block';
        if (noNonVegListingsMsg) noNonVegListingsMsg.style.display = nonVegVisible ? 'none' : 'block';
        if (noStoresMsg) noStoresMsg.style.display = storesVisible ? 'none' : 'block';
        // Update text if still visible
        if(noVegListingsMsg && !vegVisible) noVegListingsMsg.textContent = "No matching vegetarian listings found.";
        if(noNonVegListingsMsg && !nonVegVisible) noNonVegListingsMsg.textContent = "No matching non-vegetarian listings found.";
        if(noStoresMsg && !storesVisible) noStoresMsg.textContent = "No matching stores found.";
    } // End filterCardsBySearch

    // --- Function to Load Available Food Listings (Simplified - no filters parameter) ---
    async function loadAvailableFoodListings() {
        if (!vegListingsContainer || !nonVegListingsContainer || !noVegListingsMsg || !noNonVegListingsMsg) { return; }
        vegListingsContainer.innerHTML = ''; nonVegListingsContainer.innerHTML = '';
        noVegListingsMsg.style.display = 'block'; noNonVegListingsMsg.style.display = 'block';
        noVegListingsMsg.textContent = "Searching for vegetarian listings..."; // Reset text
        noNonVegListingsMsg.textContent = "Searching for non-vegetarian listings..."; // Reset text
        let vegFound = false; let nonVegFound = false;

        console.log("Loading available FOOD listings (status: Available)...");

        try {
            const listingsRef = db.collection('listings');
            const query = listingsRef.where('status', '==', 'Available').orderBy('createdAt', 'desc');
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
             if (error.code === 'failed-precondition') {
                  console.warn("Firestore query requires an index (status == Available, orderBy createdAt). Check error details for link.");
             }
        } finally {
            if (noVegListingsMsg) noVegListingsMsg.style.display = vegFound ? 'none' : 'block';
            if (noNonVegListingsMsg) noNonVegListingsMsg.style.display = nonVegFound ? 'none' : 'block';
            if(noVegListingsMsg && !vegFound) noVegListingsMsg.textContent = "No vegetarian listings found currently.";
            if(noNonVegListingsMsg && !nonVegFound) noNonVegListingsMsg.textContent = "No non-vegetarian listings found currently.";
        }
    } // End loadAvailableFoodListings

    // --- Function to Load Stores with Available Listings ---
    async function loadNearbyStores() {
         if (!storesContainer || !noStoresMsg) {
             console.error("Stores container or placeholder not found.");
             return;
         }
         storesContainer.innerHTML = ''; // Clear previous
         noStoresMsg.style.display = 'block'; // Show loading/default message
         noStoresMsg.textContent = "Loading nearby stores..."; // Update text
         let storesFound = false;
         const uniqueStores = new Map(); // Use a Map to track unique stores { storeId: storeName }

         console.log("Loading stores with available listings...");

         try {
             const listingsRef = db.collection('listings');
             const query = listingsRef.where('status', '==', 'Available'); // Only need available listings
             const snapshot = await query.get();

             if (!snapshot.empty) {
                 snapshot.forEach(doc => {
                     const data = doc.data();
                     if (data.storeId && data.storeName && !uniqueStores.has(data.storeId)) {
                         uniqueStores.set(data.storeId, data.storeName);
                     }
                 });
             }

             if (uniqueStores.size === 0) {
                 console.log("No stores found with available listings.");
                 noStoresMsg.textContent = "No stores with available items found nearby.";
             } else {
                 storesFound = true;
                 console.log(`Found ${uniqueStores.size} unique stores with listings.`);
                 uniqueStores.forEach((storeName, storeId) => {
                     displayStoreCard(storeName, storeId); // Call function to create store card
                 });
             }

         } catch (error) {
            console.error("Error loading stores based on listings:", error);
            storesContainer.innerHTML = '<p class="text-danger text-center p-3">Error loading nearby stores.</p>';
            // Check for index errors if the query becomes more complex (e.g., adding location filter later)
             if (error.code === 'failed-precondition') {
                  console.warn("Firestore query for active stores might need an index.");
             }
         } finally {
             noStoresMsg.style.display = storesFound ? 'none' : 'block';
         }
    } // End loadNearbyStores

    // --- Function to Create and Display a Single Store Card (on seeker page) ---
    function displayStoreCard(storeName, storeId) {
         if (!storesContainer) return;

         const card = document.createElement('div');
         // Give it a distinct class from food listing cards if styles differ significantly
         card.className = 'listing-card store-listing-card'; // Example class
         card.setAttribute('data-id', storeId);
         card.style.cursor = 'pointer'; // Indicate it's clickable
         card.style.textAlign = 'center'; // Center content

         card.innerHTML = `
             <div class="listing-card-body" style="justify-content: center; padding: 2rem 1rem;"> <!-- Adjust padding/alignment -->
                 <i class="fas fa-store fa-2x" style="color: var(--forest-green); margin-bottom: 0.8rem;"></i> <!-- Store icon -->
                 <h5 style="margin-bottom: 0.5rem;">${escapeHtml(storeName)}</h5>
                 <p class="details"><small>Click to see listings</small></p>
             </div>
         `;

         // Add click listener to navigate
         card.addEventListener('click', () => {
             window.location.href = `store-details.html?storeId=${storeId}`;
         });

         storesContainer.appendChild(card);
    } // End displayStoreCard

    // --- Event Listeners ---

    // 1. Search Input Listener
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterCardsBySearch(e.target.value);
        });
    }

    // 2. Filter Button Listener (Placeholder functionality)
     if (filterBtn) {
         filterBtn.addEventListener('click', () => {
             console.log("Filter button clicked (functionality deferred).");
             alert("Advanced filtering options will be added later!");
             // If you kept the modal HTML, you could open it:
             // const filterModal = bootstrap.Modal.getInstance(document.getElementById('filterModal'));
             // if (filterModal) filterModal.show();
         });
     }

    // --- Initial Load ---
    loadAvailableFoodListings();
    loadNearbyStores(); // <-- CALL THE NEW FUNCTION HERE

    // --- Authentication Listener ---
    auth.onAuthStateChanged(user => {
        const isSeekerPage = window.location.pathname.includes('seeker.html');
        if (!isSeekerPage) return;
        if (user) { console.log("Seeker page: User logged in", user.uid); }
        else { console.log("Seeker page: User logged out."); }
    });

}); // End DOMContentLoaded