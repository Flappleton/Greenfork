import React, { useEffect, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const MapPage = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const lat = parseFloat(urlParams.get("lat"));
  const lng = parseFloat(urlParams.get("lng"));

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY",
    libraries: ["places"],
  });

  const [nearbyPlaces, setNearbyPlaces] = useState([]);

  useEffect(() => {
    if (isLoaded && lat && lng) {
      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );

      const request = {
        location: new window.google.maps.LatLng(lat, lng),
        radius: 1000, // 1km radius
        type: "restaurant", // Change as needed
      };

      service.nearbySearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          setNearbyPlaces(results);
        }
      });
    }
  }, [isLoaded, lat, lng]);

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div>
      <h2>Nearby Places</h2>
      <GoogleMap
        center={{ lat, lng }}
        zoom={15}
        mapContainerStyle={{ width: "100%", height: "400px" }}
      >
        <Marker position={{ lat, lng }} />

        {nearbyPlaces.map((place, index) => (
          <Marker
            key={index}
            position={{
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            }}
          />
        ))}
      </GoogleMap>
    </div>
  );
};

export default MapPage;
