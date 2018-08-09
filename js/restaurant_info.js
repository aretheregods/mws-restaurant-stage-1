import { DBHelper } from './dbhelper.js';

// [START] page data store
var restaurantStore = {
  restaurant: {},
  reviews: () => restaurantStore.restaurant.reviews || [],
  mapVisible: false,
  mapAPILoaded: false
}
let restaurant;
let map;
// [END] page data store

// [START] get page elements
const head = document.getElementsByTagName('head')[0];
const mapContainer = document.getElementById('map-container');
const mapFab = document.getElementById('map-fab')
const mapMarker = document.getElementById('map-marker');
const svgPicture = document.getElementById('svg-picture');
var mapJS;
// [END] get page

// [START] declare map state verification data
const media1024 = window.matchMedia('(min-width: 1024px)').matches;
const pageWithMap = head.querySelector('script');
// [END] declare map state verification data

// [START] page event listeners
// Get data from device store or internet and init page data store/UI
window.addEventListener("load", function(event) {
  restaurantStore = Object.assign({}, restaurantStore, {
    loading: true
  })
  const id = getParameterByName('id');
  DBHelper.initRestaurantDataStore(id).then(res => {
    let restaurants;
    if (res.json) {
      restaurants = res.json();
    } else {
      restaurants = res;
    }
    return restaurants;
  })
    .catch(e => console.log('Some error:', e))
    .then(res => {
      restaurantStore = Object.assign({}, restaurantStore, {
        restaurant: res,
        loading: false
      });
      return restaurantStore;
    })
    .catch(e => console.log('Some error:', e))
    .then(res => {
      fillBreadcrumb();
      fillRestaurantHTML();
      return res;
    })
    .catch(e => console.log('Some error:', e))
    .then(res => media1024 && putMapInHead());
})

// [START] Declare any custom events
// Dispatch this event when the map button is clicked
if (typeof window.CustomEvent === 'function') {
  var mapEvent = new CustomEvent('mapRender', {
    bubbles: true
  })
}
// [END] Declare any custom events

// Correct the mapState when turning iPad or similar devices
window.addEventListener('resize', (ev) => {
  if (media1024) { mapFab.className = 'large-screen'; }
  if (media1024 && !pageWithMap) {
    putMapInHead();
  } else if (!media1024 && (
    (restaurantStore.mapVisible && !pageWithMap) ||
    (!restaurantStore.mapVisible && pageWithMap)
  )) {
    fixMapStateMismatch();
  }
})

// When mapRender event is heard, toggle the map on/off
document.addEventListener('mapRender', (e) => {
  toggleMap();
})

// Reset store then dispatch the mapRender event on click
mapFab.addEventListener('click', (e) => {
  restaurantStore = Object.assign({}, restaurantStore, {
    mapVisible: !restaurantStore.mapVisible
  });
  mapFab.dispatchEvent(mapEvent);
})
// [END] page event listeners

/**
 * Initialize Google map, called from HTML.
 * Removed unecessary "self" references
 */
window.initMap = () => {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 16,
    center: restaurantStore.restaurant.latlng,
    scrollwheel: false
  });
  DBHelper.mapMarkerForRestaurant(restaurantStore.restaurant, map);
}

/**
 * Create restaurant HTML and add it to the webpage
 * @param {!{name, address, cuisine_type}} restaurant
 */
const fillRestaurantHTML = (restaurant = restaurantStore.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurantSmall(restaurant) + '.jpg';
  // added alt message for images
  image.alt = `Image of ${restaurant.name}`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 * @param {!*} operatingHours
 */
const fillRestaurantHoursHTML = (operatingHours = restaurantStore.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[`${key}`];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 * @param {!Array<{name, date, rating, comments}>} reviews - An Array of review Objects
 */
const fillReviewsHTML = (reviews = restaurantStore.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews().length) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews().forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 * @param {!{name, date, rating, comments}} review
 * @return {Node|null}
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 * @param {!{name: string}} restaurant
 */
const fillBreadcrumb = (restaurant=restaurantStore.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Set/Remove classes and load API w/regard to map state
 * @param {boolean} mapShow 
 */
const toggleMap = (mapShow = restaurantStore.mapVisible) => {
  if (mapShow) {
    mapContainer.classList.replace('regular', 'mapped')
    mapMarker.classList.replace('show', 'hide');
    svgPicture.classList.replace('hide', 'show');
    putMapInHead();
  } else {
    mapContainer.classList.replace('mapped', 'regular');
    mapMarker.classList.replace('hide', 'show');
    svgPicture.classList.replace('show', 'hide');
  }
}

/** 
 * Put map in head of document if it's not already there
 * @param {boolean} apiLoaded
 */
const putMapInHead = (apiLoaded = restaurantStore.mapAPILoaded) => {
  if (!apiLoaded) {
    mapJS = document.createElement('script');
    mapJS.type = 'text/javascript';
    mapJS.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyAMJWGaXwQe9GEqdDXmJ9vd8KPHCKf2k7k&libraries=places&callback=initMap';
    head.appendChild(mapJS);
    restaurantStore = Object.assign({}, restaurantStore, {
      mapAPILoaded: true
    });
  }
  return;
}

/** 
 * Fix map state in specific cases 
 */
const fixMapStateMismatch = () => {
  if ((restaurantStore.mapVisible && pageWithMap) || !restaurantStore.mapVisible && !pageWithMap) {
    return;
  } else if (restaurantStore.mapVisible && !pageWithMap) {
    mapContainer.className = 'mapped';
    putMapInHead();
  } else if (!restaurantStore.mapVisible && pageWithMap) {
    mapContainer.className = 'regular';
  }
} 

/**
 * Get a parameter by name from page URL.
 * @param {!string} name
 * @param {string=} url
 * @return {string|null|void}
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
