import { DBHelper } from './dbhelper.js';
import { putRestaurantsInIDB } from './idbhelper.js';
import { LazyLoadHelper } from './lazyloadhelper.js';

// [START] declare global data store
var restaurantsStore = {
  restaurants: [],
  currentRestaurants: function() {
    let results = restaurantsStore.restaurants
    if (restaurantsStore.filters.cuisine != 'all') {
      results = results.filter(r => r.cuisine_type == restaurantsStore.filters.cuisine);
    }
    if (restaurantsStore.filters.neighborhood != 'all') {
      results = results.filter(r => r.neighborhood == restaurantsStore.filters.neighborhood);
    }
    return results
  },
  neighborhoods: () => restaurantsStore.restaurants.length ?
    restaurantsStore.restaurants.map((_, i, rs) => rs[i].neighborhood).filter((n, i, ns) => ns.indexOf(n) === i) :
    [],
  cuisines: () => restaurantsStore.restaurants.length ?
    restaurantsStore.restaurants.map((_, i, rs) => rs[i].cuisine_type).filter((c, i, cs) => cs.indexOf(c) === i) :
    [],
  filters: {
    cuisine: 'all',
    neighborhood: 'all'
  },
  fetchingRestaurants: false,
  mapVisible: false,
  mapAPILoaded: false
}
var map
var markers = [];
// [END] declare global data store

// [START] get target elements from DOM
var maincontent = document.getElementById('maincontent');
var restaurantsContainer = document.getElementById('restaurants-container');
var cuisineSelect = document.getElementById('cuisines-select');
var neighborhoodSelect = document.getElementById('neighborhoods-select');
var restaurantsList = document.getElementById('restaurants-list');
var head = document.getElementsByTagName('head')[0];
var mapContainer = document.getElementById('map-container');
var mapFAB = document.getElementById('map-fab');
var mapJS;
// [END] get target elements from DOM

// [START] declare and add event listeners
if (typeof window.CustomEvent === 'function') {
  var restaurantEvent = new CustomEvent('restauRender', {
    bubbles: true
  });
  var mapToggle = new CustomEvent('mapToggle', {
    bubbles: true
  });
  var mapRender = new CustomEvent('mapRender', {
    bubbles: true
});
}

/**
 * Listen for app specific events
 */
document.addEventListener('restauRender', (e) => {
  fillRestaurantsHTML();
})

document.addEventListener('mapToggle', (e) => {
  toggleMap();
})

document.addEventListener('mapRender', (e) => {
  addMarkersToMap();
})

/**
 * Fetch data and load restaurants store as soon as page is loaded.
 */
document.addEventListener("DOMContentLoaded", (event) => {
  restaurantsStore = Object.assign({}, restaurantsStore, {
    fetchingRestaurants: true
  });
  DBHelper.initDataStore()
    .then(res => {
      let restaurants;
      if (res.json) {
        restaurants = res.json();
      } else {
        restaurants = res;
      }
      return restaurants;
    })
    .catch(e => console.error(e))
    .then(res => {
      restaurantsStore = Object.assign({}, restaurantsStore, {
        restaurants: res,
        fetchingRestaurants: false
      });
      return restaurantsStore;
    })
    .then(res => {
      fillCuisinesHTML();
      fillNeighborhoodsHTML();
      fillRestaurantsHTML();
      return res;
    })
    .catch(e => console.error(e))
    .then(res => {
      requestIdleCallback(() => putRestaurantsInIDB(res.restaurants))
    })
    .catch(e => console.error(e));
});

/**
 * Listen for native events and dispatch app specific ones
 */
neighborhoodSelect.addEventListener('change', (e) => {
  restaurantsStore.filters.neighborhood = e.target.value;
  neighborhoodSelect.dispatchEvent(restaurantEvent);
  restaurantsStore.mapVisible && neighborhoodSelect.dispatchEvent(mapRender);
})

cuisineSelect.addEventListener('change', (e) => {
  restaurantsStore.filters.cuisine = e.target.value;
  cuisineSelect.dispatchEvent(restaurantEvent);
  restaurantsStore.mapVisible && neighborhoodSelect.dispatchEvent(mapRender);
})

mapFAB.addEventListener('click', (e) => {
  restaurantsStore = Object.assign({}, restaurantsStore, {
      mapVisible: !restaurantsStore.mapVisible
  });
  mapFAB.dispatchEvent(mapToggle);
})
// [END] declare and add event listeners

/**
 * Set neighborhoods HTML.
 * @param {!Array<string>} neighborhoods
 */
const fillNeighborhoodsHTML = (neighborhoods = restaurantsStore.neighborhoods) => {
  neighborhoods().forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    neighborhoodSelect.append(option);
  });
}

/**
 * Set cuisines HTML.
 * @param {!Array<string>} cuisines
 */
const fillCuisinesHTML = (cuisines = restaurantsStore.cuisines) => {
  cuisines().forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    cuisineSelect.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  map = new google.maps.Map(mapContainer, {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  addMarkersToMap();
}

/**
 * Create all restaurants HTML and add them to the webpage.
 * @param {!Array<Object>} restaurants
 */
const fillRestaurantsHTML = (restaurants = restaurantsStore.currentRestaurants) => {
  restaurantsList.innerHTML = '';
  restaurants().forEach(restaurant => {
    restaurantsList.append(createRestaurantHTML(restaurant));
  });
  LazyLoadHelper.init();
}

/**
 * Create restaurant HTML.
 * @param {!{name, neighborhood, address}} restaurant - A single restaurant Object
 * @return {*}
 */
const createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  // use data-src for lazy loading image
  image.dataset.src = DBHelper.imageUrlForRestaurantSmall(restaurant) + '.jpg';
  image.src = "";
  // added alt message for images
  image.alt = `Image of ${restaurant.name}`;
  li.append(image);

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  return li
}

/**
 * Call correct map handler based on current map state
 * @param {boolean} mapped
 * @return {function ()}
 */
const toggleMap = (mapped = restaurantsStore.mapVisible) => {
  return mapped ?
    fillMapHTML() :
    emptyMapHTML() ;
}

/**
 * Add/Remove mapped state classes according to current window dimensions
 */
const fillMapHTML = () => {
  if (window.matchMedia( "(min-width: 730px)" ).matches) {
    restaurantsContainer.classList.replace('regular', 'mapped');
    mapContainer.classList.replace('regular', 'mapped');
    document.getElementById('footer').className = 'mapped';
  } else if(window.matchMedia( "(min-width: 568px)" ).matches) {
    return;
  } else {
    mapContainer.classList.replace('regular', 'mapped');
    maincontent.classList.replace('regular', 'fixed');
  }
  document.getElementById('map-marker').classList.replace('show', 'hide');
  document.getElementById('close-map').classList.replace('hide', 'show');

  loadMapAPI();
}

/**
 * Put map API in head of document if it's not already there
 * Otherwise just return
 * @param {boolean} apiLoaded 
 */
const loadMapAPI = (apiLoaded = restaurantsStore.mapAPILoaded) => {
  if (!apiLoaded) {
    mapJS = document.createElement('script');
    mapJS.type = 'text/javascript';
    mapJS.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyAMJWGaXwQe9GEqdDXmJ9vd8KPHCKf2k7k&libraries=places&callback=initMap';
    head.appendChild(mapJS);
    restaurantsStore = Object.assign({}, restaurantsStore, {
      mapAPILoaded: true
    });
  }
  return;
}

/**
 * Toggle classes for empty unmapped state
 */
const emptyMapHTML = () => {
  if (window.matchMedia( "(min-width: 730px)" ).matches) {
    restaurantsContainer.classList.replace('mapped', 'regular');
    mapContainer.classList.replace('mapped', 'regular')
    document.getElementById('footer').className = 'regular';
  } else if(window.matchMedia( "(min-width: 568px)" ).matches) {
    return;
  } else {
    mapContainer.classList.replace('mapped', 'regular');
    maincontent.classList.replace('fixed', 'regular');
  }
  document.getElementById('map-marker').classList.replace('hide', 'show');
  document.getElementById('close-map').classList.replace('show', 'hide');
}

/**
 * Add markers for current restaurants to the map.
 * @param {!Array<Object>} restaurants
 */
const addMarkersToMap = (restaurants = restaurantsStore.currentRestaurants) => {
  markers.length && markers.forEach(m => m.setMap(null));
  markers = restaurants().map(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    return marker;
  });
}

/**
 * Polyfill for if user has a crappy browser
 */
window.requestIdleCallback = window.requestIdleCallback ||
  function (cb) {
    return setTimeout(function () {
      var start = Date.now();
      cb({ 
        didTimeout: false,
        timeRemaining: function () {
          return Math.max(0, 50 - (Date.now() - start));
        }
      });
    }, 1);
  }

window.cancelIdleCallback = window.cancelIdleCallback ||
  function (id) {
    clearTimeout(id);
  } 