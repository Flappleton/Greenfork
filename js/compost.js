// compost.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase (should already be done in firebase-init.js)
    
    // Reference to the compost pooling collection
    const compostPoolRef = firebase.firestore().collection('compostPool');
    
    // Form submission handler
    const poolingForm = document.getElementById('poolingForm');
    if (poolingForm) {
        poolingForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Check if user is logged in
            const user = firebase.auth().currentUser;
            if (!user) {
                alert('Please sign in to add items to the compost pool.');
                return;
            }
            
            // Get form values
            const foodType = document.getElementById('foodType').value;
            const quantity = parseFloat(document.getElementById('quantity').value);
            const notes = document.getElementById('notes').value || 'None';
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            
            try {
                // Add to Firestore
                await compostPoolRef.add({
                    userId: user.uid,
                    userEmail: user.email,
                    foodType,
                    quantity,
                    notes,
                    createdAt: timestamp,
                    status: 'pending'
                });
                
                // Reset form
                poolingForm.reset();
                
                // Refresh the displayed items
                displayPoolItems();
            } catch (error) {
                console.error('Error adding compost pool item:', error);
                alert('Error adding item. Please try again.');
            }
        });
    }
    
    // Function to display pool items
    async function displayPoolItems() {
        const poolingList = document.getElementById('poolingList');
        if (!poolingList) return;
        
        // Clear existing items
        poolingList.innerHTML = '';
        
        try {
            // Get items from Firestore, ordered by creation date
            const snapshot = await compostPoolRef
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
            
            if (snapshot.empty) {
                poolingList.innerHTML = '<p class="text-center">No items in the compost pool yet.</p>';
                return;
            }
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const poolItem = document.createElement('div');
                poolItem.className = 'pool-item';
                poolItem.innerHTML = `
                    <h3>${data.foodType}</h3>
                    <p>Quantity: ${data.quantity} kg</p>
                    <p>Notes: ${data.notes}</p>
                    <small class="text-muted">Posted by: ${data.userEmail}</small>
                `;
                poolingList.appendChild(poolItem);
            });
        } catch (error) {
            console.error('Error getting compost pool items:', error);
            poolingList.innerHTML = '<p class="text-center">Error loading compost pool items.</p>';
        }
    }
    
    // Load pool items when page loads
    displayPoolItems();
    
    // Listen for auth state changes to update UI
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in
            displayPoolItems();
        }
    });
});