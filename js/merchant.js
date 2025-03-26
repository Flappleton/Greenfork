document.addEventListener("DOMContentLoaded", function () {
    const storeModal = document.getElementById("storeModal");
    const addStoreBtn = document.getElementById("addStoreBtn");
    const closeModal = document.getElementsByClassName("close")[0];
    const storeForm = document.getElementById("storeForm");
    const storeContainer = document.querySelector(".store-container");
    
    let autocomplete;
    const locationInput = document.getElementById("storeLocation");

    // Google Maps Autocomplete
    function initAutocomplete() {
        autocomplete = new google.maps.places.Autocomplete(locationInput);
    }

    // Open modal
    addStoreBtn.addEventListener("click", function () {
        storeModal.style.display = "block";
    });

    // Close modal
    closeModal.addEventListener("click", function () {
        storeModal.style.display = "none";
    });

    // Submit store form
    storeForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const storeName = document.getElementById("storeName").value;
        const storeLocation = document.getElementById("storeLocation").value;
        const storeImage = document.getElementById("storeImage").files[0];

        if (storeName && storeLocation) {
            const storeCard = document.createElement("div");
            storeCard.classList.add("store-card");

            let imgElement = document.createElement("img");
            if (storeImage) {
                let reader = new FileReader();
                reader.onload = function (e) {
                    imgElement.src = e.target.result;
                };
                reader.readAsDataURL(storeImage);
            } else {
                imgElement.src = "images/default_store.png";
            }

            const storeTitle = document.createElement("p");
            storeTitle.textContent = storeName;

            storeCard.appendChild(imgElement);
            storeCard.appendChild(storeTitle);
            storeContainer.appendChild(storeCard);

            storeModal.style.display = "none";
            storeForm.reset();
        }
    });

    initAutocomplete();
});
