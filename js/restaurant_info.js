import { DBHelper } from './dbhelper.js';
import { putReviewsInIDB, putReviewInIDB } from './idbhelper.js';

// [START] page data store
var restaurantStore = {
  restaurant: {},
  reviews: [],
  fetchingRestaurant: false,
  fetchingReviews: false,
  mapVisible: false,
  mapAPILoaded: false
}
var restaurant;
var map;
var observerConfig = {
  rootMargin: '50px 0px',
  threshold: 1
}
// [END] page data store

// [START] get page elements
const head = document.getElementsByTagName('head')[0];
const mapContainer = document.getElementById('map-container');
const mapFab = document.getElementById('map-fab')
const mapMarker = document.getElementById('map-marker');
const svgPicture = document.getElementById('svg-picture');
var reviewsContainer;
var mapJS;
// [END] get page

// [START] declare map state verification data
const media1024 = window.matchMedia('(min-width: 1024px)').matches;
const pageWithMap = head.getElementsByTagName('script')[0];
// [END] declare map state verification data

// [START] page event listeners
// Get data from device store or internet and init page data store/UI
document.addEventListener("DOMContentLoaded", function(event) {
  restaurantStore = Object.assign({}, restaurantStore, {
    loading: true
  })
  const id = getParameterByName('id');
  DBHelper.initRestaurantDataStore(id).then(res => {
      let restaurants;
      res.json ?
        restaurants = res.json() :
        restaurants = res;
      return restaurants;
    })
    .catch(e => console.log('Some error:', e))
    .then(res => {
      restaurantStore = Object.assign({}, restaurantStore, {
        restaurant: res,
        loading: false
      });
      return res;
    })
    .catch(e => console.log('Some error:', e))
    .then(res => {
      fillBreadcrumb();
      fillRestaurantHTML();
      return res;
    })
    .then(res => putRestaurantInPageTitle(res.name))
    .catch(e => console.log('Some error:', e))
    .then(_ => document.dispatchEvent(reviewsRender))
    .then(_ => media1024 && putMapInHead())
    .then(_ => requestIdleCallback(() => getReviewsObserver(reviewsContainer)));
})

// [START] Declare any custom events
// Dispatch this event when the map button is clicked
if (typeof window.CustomEvent === 'function') {
  var mapEvent = new CustomEvent('mapRender', {
    bubbles: true
  });
  var reviewsRender = new CustomEvent('reviewsRender', {
    bubbles: true
  });
}
// [END] Declare any custom events

// Correct the mapState when turning iPad or similar devices
window.addEventListener('resize', (_) => {
  if (media1024) { mapFab.className = 'large-screen'; }
  if (media1024 && !pageWithMap) {
    mapContainer.className = 'regular';
    putMapInHead();
  } else if (!media1024 && (
    (restaurantStore.mapVisible && !pageWithMap) ||
    (!restaurantStore.mapVisible && pageWithMap)
  )) {
    fixMapStateMismatch();
  }
});

// When mapRender event is heard, toggle the map on/off
document.addEventListener('mapRender', (_) => {
  toggleMap();
})

document.addEventListener('reviewsRender', (_) => {
  fillReviewsHTML();
})

document.addEventListener('submit', (e) => {
  e.preventDefault();
  DBHelper.backoffPost({tries: 6, timeoutLength: 500}, DBHelper.postReviewRemote, getFormData(e.target.id))
    .then(res => window.dispatchEvent(reviewsRender));
})

// Reset store then dispatch the mapRender event on click
mapFab.addEventListener('click', (_) => {
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
  var noReviews;
  reviewsContainer = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  const newReview = makeEditableReviewHTML();
  const hr = document.createElement('hr');
  title.innerHTML = 'Reviews';

  if (!reviews.length) {
    reviewsContainer.appendChild(title);
    reviewsContainer.appendChild(newReview);
    reviewsContainer.appendChild(hr);
    noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    reviewsContainer.appendChild(noReviews);
    return;
  } else if (reviews.length) {
    noReviews = reviewsContainer.getElementsByTagName('p')[0];
    reviewsContainer.removeChild(noReviews);
  }

  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  
  reviewsContainer.appendChild(ul);
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
  const reviewDate = new Date(review.updatedAt)
  date.innerHTML = `${reviewDate.toLocaleDateString()} at ${reviewDate.toLocaleTimeString()}`;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

const makeEditableReviewHTML = (currentReviewData = {
  currentFormIndex: 0,
  nameInputValue: '',
  ratingInputValue: 0,
  commentTextareaValue: ''
}) => {
  const form = document.createElement('form');
  const formTitle = document.createElement('h3');
  form.method = 'POST';
  form.id = currentReviewData.currentFormIndex ?
    `comment${currentReviewData.currentFormIndex}` :
    'new-comment';

  formTitle.textContent = 'Leave a Review';
  
  const nameInput = document.createRange().createContextualFragment(`
  <div>
    <label for="reviewer-name">Name</label>
    <input type="text" name="name" id="reviewer-name" value="${currentReviewData.nameInputValue || ''}">
  </div>`)

  const ratingInput = document.createRange().createContextualFragment(`
  <fieldset>
    <legend>Rating</legend>
    <div>
      ${ratingInputHTML()}
    </div>
  </fieldset>`);

  const commentTextarea = document.createRange().createContextualFragment(`
  <div>
    <label for="comment">Comment</label>
    <textarea name="comments" id="comment" value="${currentReviewData.ratingInputValue}"></textarea>
  </div>`);

  const submitReview = document.createRange().createContextualFragment(`
  <div>
    <button type="submit" id="submit-comment">Submit</button>
  </div>`);

  [formTitle, nameInput, ratingInput, commentTextarea, submitReview]
    .forEach(element => form.appendChild(element));

  return form;
}

const ratingInputHTML = () => {
  const radios = [[1, 'Awful'], [2, 'Not Tasty'], [3, 'Edible'], [4, 'Tasty'], [5, 'Delicious']].map(n => `
  <input type="radio" id="star${n[0]}" name="rating" value="${n[0]}">
  <label for="star${n[0]}" title="${n[1]}">${n[0]} ${n[0] > 1 ? 'stars' : 'star'}</label>
  `);

  return radios.reduceRight((f, n) => f + n, '');
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

const getFormData = (id) => {
  const currentForm = document.getElementById(id);
  const formObject = new FormData(currentForm);
  formObject.append('restaurant_id', restaurantStore.restaurant.id);
  return formObject;
}

const getReviewsObserver = () => {
  reviewsContainer = document.getElementById('reviews-container');
  let observer = new IntersectionObserver(watchReviews, observerConfig);
  observer.observe(reviewsContainer);
}

const watchReviews = (entry, observer) => {
  if (entry.intersectionRatio < observerConfig.threshold) {
    return;
  }
  observer.unobserve(reviewsContainer);
  restaurantStore = Object.assign({}, restaurantStore, {
    fetchingReviews: true
  })
  return DBHelper.fetchReviewsRemote(restaurantStore.restaurant.id)
    .then(res => {
      let r = res.json();
      return r;
    })
    .catch(e => console.error(e))
    .then(res => {
      restaurantStore = Object.assign({}, restaurantStore, {
        reviews: res,
        fetchingReviews: false
      });
      reviewsContainer.dispatchEvent(reviewsRender);
    })
    .catch(e => console.error(e))
    .then(_ => observer.disconnect())
    .catch(e => console.error(e))
    .then(_ => requestIdleCallback(() => putReviewsInIDB(restaurantStore.reviews)))
    .catch(e => console.error(e));
}

/**
 * Fix map state in specific cases
 * Doesn't work on iPad orientationChange
 * I need to rethink how to accomplish that
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
 * Adds restaurant specific title in tab & meta description
 * @param {string} name 
 */
const putRestaurantInPageTitle = (name = restaurantStore.restaurant.name) => {
  const oldTitle = head.getElementsByTagName('title')[0];
  const newTitle = document.createElement('title');
  newTitle.textContent = `Information and reviews for ${name}`;
  const initialMetaForDescription = head.getElementsByTagName('meta')[2];
  const metaDescription = document.createElement('meta');
  metaDescription.name = 'description';
  metaDescription.content = `Information and reviews for ${restaurantStore.restaurant.name}`;

  head.replaceChild(newTitle, oldTitle);
  head.replaceChild(metaDescription, initialMetaForDescription);
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
