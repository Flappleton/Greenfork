document.addEventListener('DOMContentLoaded', function() {
    // Load compost pool items on page load
    loadCompostPool();

    // Pooling Form Submission
    document.getElementById('poolingForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get form values
        const foodType = document.getElementById('foodType').value;
        const quantity = document.getElementById('quantity').value;
        const notes = document.getElementById('notes').value || 'None';

        try {
            // Get Firebase auth token
            const user = firebase.auth().currentUser;
            if (!user) {
                alert('Please sign in to add to compost pool');
                return;
            }

            const token = await user.getIdToken();

            // Send to backend
            const response = await fetch('http://localhost:5000/api/compost', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ foodType, quantity, notes })
            });

            const data = await response.json();

            if (response.ok) {
                // Add to UI
                addPoolItemToUI(data.data);
                // Reset form
                this.reset();
            } else {
                alert(data.message || 'Failed to add to compost pool');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('An error occurred. Please try again.');
        }
    });
});

// Load compost pool items from backend
async function loadCompostPool() {
    try {
        const response = await fetch('http://localhost:5000/api/compost');
        const data = await response.json();

        if (response.ok) {
            const poolingList = document.getElementById('poolingList');
            // Clear existing items (except sample)
            while (poolingList.children.length > 1) {
                poolingList.removeChild(poolingList.lastChild);
            }

            // Add items from backend
            data.data.forEach(item => {
                addPoolItemToUI(item);
            });
        } else {
            console.error('Failed to load compost pool:', data.message);
        }
    } catch (err) {
        console.error('Error loading compost pool:', err);
    }
}

// Helper function to add item to UI
function addPoolItemToUI(item) {
    const poolingList = document.getElementById('poolingList');
    
    const poolItem = document.createElement('div');
    poolItem.className = 'pool-item';
    poolItem.innerHTML = `
        <h3>${item.foodType}</h3>
        <p>Quantity: ${item.quantity} kg</p>
        <p>Notes: ${item.notes}</p>
        ${item.merchantId && item.merchantId.name ? `<small>Added by: ${item.merchantId.name}</small>` : ''}
    `;

    poolingList.appendChild(poolItem);
}
