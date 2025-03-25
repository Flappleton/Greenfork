// Handle donation form submission
document.getElementById('donateForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const foodType = document.getElementById('foodType').value;
    const quantity = document.getElementById('quantity').value;
    const location = document.getElementById('location').value;
    
    alert(`Donation Submitted!\nFood Type: ${foodType}\nQuantity: ${quantity}\nLocation: ${location}`);
    this.reset();
});