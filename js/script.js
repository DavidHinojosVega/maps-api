
let map;
let service; 
let markers = [];
let infoWindow; 
let promedioMarker = null; 
let places = [] 
let promedioLocation = null;
let promedioCircle=null;
let maxMinLine = null; 




const center = { lat: 30.378746, lng: -107.880062 };
const restaurantListElement = document.getElementById("restaurants-list");
let getPhotoUrlFunction;

let currentSearch ="Tacos, comida, restaurantes"


async function initMap() {
  const defaultLocation = center;
    const { Place, getPhotoUrl } = await google.maps.importLibrary("places");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker"); // <-- ¡Añadido!

    getPhotoUrlFunction = getPhotoUrl; 
    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 14,
        mapId: "ITSNCG-MAP", 
    });
    
    infoWindow = new google.maps.InfoWindow();
     await findPlaces(currentSearch);
    
}

function clearMarkers() {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];
  if (infoWindow) infoWindow.close();
  if (restaurantListElement) {
      restaurantListElement.innerHTML = "";
  }
}

async function addMarkerAndDisplay(place, bounds) {
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const marker = new AdvancedMarkerElement({
      map,
      position: place.location,
      title: place.displayName,
    });
    bounds.extend(place.location);
    markers.push(marker);
    displayRestaurant(place);
    marker.addListener("click", () => {
        infoWindow.close(); 
        const content = `
            <div class="info-window-content">
                <h6 class="fw-bold">${place.displayName}</h6>
                <p class="mb-1">${place.formattedAddress || 'Dirección no disponible'}</p>
                <div class="rating text-warning">⭐ ${place.rating || 'N/A'}</div>
            </div>
        `;
        infoWindow.setContent(content);
        infoWindow.open({
            anchor: marker,
            map: map,
            shouldFocus: false, 
        });
        map.panTo(place.location);
    });
}

async function findPlaces(searchText) {
  clearMarkers(); 
  const { Place } = await google.maps.importLibrary("places");
  const { LatLngBounds } = await google.maps.importLibrary("core");

  const bounds = new LatLngBounds();

  const request = {
    textQuery: searchText, 
    fields: [
      "displayName",
      "location",
      "businessStatus",
      "rating",
      "photos",
      "formattedAddress",
      "userRatingCount"
    ],
    locationBias: center,
    isOpenNow: true,
    language: "es-MX",
    maxResultCount: 20,
    region: "mx"
  };

const { places: foundPlaces } = await Place.searchByText(request);
places = foundPlaces || []; 
  console.log(`Resultados para "${searchText}":`, places);

  if (!places || places.length === 0) {
    console.log("No se encontraron resultados.");
    if (restaurantListElement) {
      restaurantListElement.innerHTML = <p class='text-center mt-4'>No se encontraron resultados para "${searchText}".</p>;
    }
    return;
  }

  let validCount = 0;
  let sumLat = 0;
  let sumLng = 0;

  for (const place of places) {
    const lat = place.location?.lat();
    const lng = place.location?.lng();

    if (typeof lat === "number" && typeof lng === "number") {
      sumLat += lat;
      sumLng += lng;
      validCount++;
      await addMarkerAndDisplay(place, bounds);
    } else {
      console.warn("Lugar con coordenadas inválidas:", place.displayName);
    }
  }

  if (validCount > 0) {
    map.fitBounds(bounds);

    const avgLat = sumLat / validCount;
    const avgLng = sumLng / validCount;

    if (!isNaN(avgLat) && !isNaN(avgLng)) {
       promedioLocation = new google.maps.LatLng(avgLat, avgLng);
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

      if (promedioMarker) {
        promedioMarker.map = null;
      }

      const img = document.createElement("img");
      img.src = "./icons/icon.png";
      img.style.width = "45px";
      img.style.height = "45px";

      promedioMarker = new AdvancedMarkerElement({
        map,
        position: promedioLocation,
        content: img,
        title: "Promedio de los lugares encontrados",
      });

      promedioMarker.addListener("click", () => {
        infoWindow.close();
        infoWindow.setContent(`
          <div class="fw-bold">Promedio de los lugares encontrados</div>
          <div>Latitud: ${avgLat.toFixed(6)}</div>
          <div>Longitud: ${avgLng.toFixed(6)}</div>
        `);
        infoWindow.open({ anchor: promedioMarker, map });
      });


const { Polyline } = await google.maps.importLibrary("maps");

let maxDist = 0;
const distances = places.map(p => {
  const loc = p.location;
  const d = google.maps.geometry.spherical.computeDistanceBetween(promedioLocation, loc);
  if (d > maxDist) maxDist = d;
  return d;
});


const minDistance = maxDist * 0.05;

const filtrados = places.filter((p, i) => distances[i] >= minDistance);




if (restaurantListElement) restaurantListElement.innerHTML = "";


filtrados.forEach(place => displayRestaurant(place));


if (promedioCircle) {
    promedioCircle.setMap(null);
}

promedioCircle = new google.maps.Circle({
  strokeColor: "#4a7df0",    
  strokeOpacity: 0.8,
  strokeWeight: 2,
  fillColor: "#a5bef7",     
  fillOpacity: 0.2,
  map: map,
  center: promedioLocation,
  radius: maxDist               
});

if (places.length > 0 && promedioLocation) {
    const { Polyline } = await google.maps.importLibrary("maps");

    
    let minDist = Infinity;
    let maxDist = 0;
    let closestPlace = null;
    let farthestPlace = null;

    for (const place of places) {
        const loc = place.location;
        const d = google.maps.geometry.spherical.computeDistanceBetween(promedioLocation, loc);
        if (d < minDist) {
            minDist = d;
            closestPlace = loc;
        }
        if (d > maxDist) {
            maxDist = d;
            farthestPlace = loc;
        }
    }

    
    if (maxMinLine) {
        maxMinLine.setMap(null);
    }

    
    maxMinLine = new google.maps.Polyline({
        path: [closestPlace, farthestPlace],
        geodesic: true,
        strokeColor: "#00008b",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: map
    });
}


    }
  }
}


async function displayRestaurant(place) {
    const ratingCount = place.userRatingCount ? `(${place.userRatingCount} Comentarios)` : '(Sin comentarios)';

    if (!restaurantListElement) return;

    let photoUrl = "";
    
    if (place.photos && place.photos.length > 0) {
        photoUrl = place.photos[0].getURI({ 
            maxWidth: 500, 
            maxHeight: 200 
        });
    }
    let statusText = place.businessStatus === 'OPERATIONAL' ? 
        '<span class="text-success fw-bold">Abierto</span>' : 
        '<span class="text-danger fw-bold">Estado Desconocido</span>';

    const card = `
        <div class="restaurant-card p-3" onclick="map.panTo({lat: ${place.location.lat}, lng: ${place.location.lng}}); map.setZoom(17);">
            <img src="${photoUrl}" class="w-100 restaurant-img" alt="${place.displayName}" loading="lazy">
            <h6 class="mt-3 mb-1 fw-bold">${place.displayName}</h6>
            <p class="mb-1 text-muted">
                ${place.formattedAddress || 'Dirección no disponible'}
            </p>
            <p class="mb-2 text-muted">
                ${statusText} 
            </p>
            <div class="rating text-warning">⭐ ${place.rating || 'N/A'} ${ratingCount}</div>
        </div>
    `;

    restaurantListElement.innerHTML += card;
}

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", async (e) => {
    e.preventDefault();

    const newSearch = e.target.getAttribute("data-search");
    console.log("Nuevo término de búsqueda:", newSearch);

    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
    e.target.classList.add("active");

    await findPlaces(newSearch);
  });
});


async function searchCityAndPlaces(cityName) {
    const { Geocoder } = await google.maps.importLibrary("geocoding");
    const geocoder = new Geocoder();
    geocoder.geocode({ address: cityName }, (results, status) => {
        if (status === "OK" && results[0]) {
            const newLocation = results[0].geometry.location; 
            center.lat = newLocation.lat();
            center.lng = newLocation.lng();
            map.setCenter(newLocation);
            findPlaces(currentSearch); 
        } else {
            console.error("Geocoding falló con el estado:", status);
            alert(`No se pudo encontrar la ubicación para "${cityName}": ${status}`);
        }
    });
}


document.addEventListener("DOMContentLoaded", () => {
    const searchButton = document.getElementById("search-btn");
    const locationInput = document.getElementById("location-input");
    
    if (searchButton && locationInput) {
        searchButton.addEventListener("click", () => {
            const searchText = locationInput.value.trim();
            if (searchText) {
                searchCityAndPlaces(searchText);
            }
        });
        
        locationInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                searchButton.click();
            }
        });
    }

    document.getElementById("btnValorados")?.addEventListener("click", () => {
  if (!places || places.length === 0) {
    console.warn("No hay lugares cargados aún.");
    return;
  }

  if (restaurantListElement) restaurantListElement.innerHTML = "";

  const ordenados = [...places].sort((a, b) => {
    const countA = a.userRatingCount || 0;
    const countB = b.userRatingCount || 0;
    return countB - countA;
  });

  console.log("Lugares ordenados por valoraciones:", ordenados);

  for (const place of ordenados) {
    displayRestaurant(place);
  }
});

document.getElementById("btnRating")?.addEventListener("click", () => {
  if (!places || places.length === 0) {
    console.warn("No hay lugares cargados aún.");
    return;
  }

  if (restaurantListElement) restaurantListElement.innerHTML = "";

  const ordenadosPorRating = [...places].sort((a, b) => {
    const ratingA = a.rating || 0;
    const ratingB = b.rating || 0;
    return ratingB - ratingA;
  });

  console.log("Lugares ordenados por calificación:", ordenadosPorRating);


  for (const place of ordenadosPorRating) {
    displayRestaurant(place);
  }
});

});