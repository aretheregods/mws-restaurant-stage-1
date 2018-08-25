import { DBHelper } from './dbhelper.js';
import { putReviewsInIDB, putReviewInIDB, fetchReviewsFromIDB } from './idbhelper.js';

// [START] page data store
var restaurantStore = {
  restaurant: {},
  reviews: [],
  thingsToPost: [],
  nextPostWaitTime: 0,
  postTriesTotalTime: 0,
  postTries: 1,
  sendingPost: false,
  fetchingRestaurant: false,
  fetchingReviews: false,
  mapVisible: false,
  mapAPILoaded: false,
  currentlyConnected: true
}
var restaurant;
var map;

restaurantStore = !navigator.onLine ? Object.assign({}, restaurantStore, {
  currentlyConnected: false
}) :
  restaurantStore;
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
      console.log(restaurantStore)
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
    .then(_ => requestIdleCallback(() => getReviews()));
})

window.addEventListener('unload', (e) => {
  window.postTimeOut && window.clearTimeout(postTimeOut);
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
  var postOffline = new CustomEvent('postOffline', {
    bubbles: true,
    detail: {
      message: "You're offline. We saved your review and will try to send it when you reconnect."
    }
  });
  var postSuccess = new CustomEvent('postSuccess', {
    bubbles: true,
    detail: {
      message: `You reviewed this restaurant!`
    }
  });
  var favoriteSuccess = new CustomEvent('favoriteSuccess', {
    bubbles: true,
    detail: {
      message: `You favorited this restaurant`
    }
  });
  var unfavoriteSuccess = new CustomEvent('unfavoriteSuccess', {
    bubbles: true,
    detail: {
      message: 'You unfavorited this restaurant'
    }
  });
  var postTimedOut = new CustomEvent('postTimedOut', {
    bubbles: true,
    detail: {
      message: "We're having trouble sending your review. We saved it offline and will try again."
    }
  });
  var favoriteFailure = new CustomEvent('favoriteFailure', {
    bubbles: true,
    detail: {
      message: "We couldn't send your favorite. Please check your network connection and try again."
    }
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
/**
 * Renders reviews with data from the network when online
 * And with data from IDB when offline
 */
document.addEventListener('reviewsRender', (_) => {
  navigator.onLine ?
    fillReviewsHTML() :
    fillReviewsHTML(restaurantStore.restaurant.reviews);
})

document.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = getFormData(e.target.id);
  const formObj = {};
  const formJSON = DBHelper.objFromFormData(form);
  formObj['json'] = formJSON;
  formObj['data'] = form;
  restaurantStore.thingsToPost.push(formObj);
  document.getElementById(e.target.id).reset();
  addPostedReview(formJSON);
  
  navigator.onLine ?
    initOnlinePost(restaurantStore.thingsToPost[0]) :
    initOfflinePost(restaurantStore.thingsToPost[0]);
})

/**
 * Adds post related event listeners
 */
for (let listener of ['postOffline', 'favoriteOffline', 'postSuccess', 'favoriteSuccess', 'unfavoriteSuccess', 'postTimedOut', 'favoriteOffline']) {
  document.addEventListener(listener, (e) => {
    showPostToast(e.detail.message);
    window.postTimeOut = listener === 'postTimedOut' && setTimeout(() => {
      initOnlinePost(restaurantStore.thingsToPost[0])
    }, restaurantStore.nextPostWaitTime);
    (listener === 'unfavoriteSuccess' ||
      listener === 'favoriteSuccess') &&
      toggleFavorite();
  })
}

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
  var favorite = document.createElement('span'),
          type = document.createElement('span');
  favorite.id = 'favorite';
  favorite.className = `${restaurantStore.restaurant.is_favorite ? 'favorited' : 'unfavorited'}`;
  favorite.innerHTML = `<button aria-label="Toggle Favorite">&#9829;</button>`;
  type.textContent = restaurant.cuisine_type;
  cuisine.appendChild(type);
  cuisine.appendChild(favorite);
  favorite.addEventListener('click', (e) => {
    initOnlinePost(!restaurantStore.restaurant.is_favorite)
  })

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
 * Optimistically adds a new review to the list of reviews
 * @param {Object} review 
 */
const addPostedReview = (review) => {
  reviewsContainer = document.getElementById('reviews-container');
  const ul = reviewsContainer.getElementsByTagName('ul')[0];
  const newReview = createReviewHTML(review);
  ul.appendChild(newReview);
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
  } else if (!reviewsContainer.contains(reviewsContainer.getElementsByTagName('h2')[0]) &&
    !reviewsContainer.contains(document.getElementById('new-review'))) {
    reviewsContainer.appendChild(title);
    reviewsContainer.appendChild(newReview);
    reviewsContainer.appendChild(hr);
  }
  if (reviews.length || restaurantStore.restaurant.reviews.length) {
    noReviews = reviewsContainer.getElementsByTagName('p')[0];
    (noReviews && noReviews.innerHTML === 'No reviews yet!') && reviewsContainer.removeChild(noReviews);
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
  const reviewDate = review.updatedAt ?
    new Date(review.updatedAt) :
    new Date();
  date.innerHTML = `${reviewDate.toLocaleDateString()} at ${reviewDate.toLocaleTimeString()}`;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: <span class="review-rating">${'&#x1F374;'.repeat(review.rating)}</span>`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Does what it says on the tin -
 * As in, it makes the html for the new review form
 * @param {Object} currentReviewData
 */
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
    'edit-review' :
    'new-review';

  formTitle.textContent = 'Leave a Review';
  
  const nameInput = document.createRange().createContextualFragment(`
  <div class="review-input">
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
  <div class="review-input">
    <label for="comment">Comment</label>
    <textarea name="comments" id="comment" value="${currentReviewData.ratingInputValue}"></textarea>
  </div>`);

  const submitReview = document.createRange().createContextualFragment(`
  <div class="review-submit">
    <button type="submit" id="submit-comment">Submit</button>
  </div>`);

  [formTitle, nameInput, ratingInput, commentTextarea, submitReview]
    .forEach(element => form.appendChild(element));

  return form;
}

/**
 * Creates HTML for rating input
 * Mostly to clean up the function in which this is used
 */
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

/**
 * Gets the FormData from the form with the given id
 * @param {string|number} id 
 */
const getFormData = (id) => {
  const currentForm = document.getElementById(id);
  const formObject = new FormData(currentForm);
  formObject.append('restaurant_id', restaurantStore.restaurant.id);
  return formObject;
}

/**
 * Gets reviews from either the network
 * And puts them in idb
 */
const getReviews = () => {
  return DBHelper.fetchReviewsRemote(restaurantStore.restaurant.id)
    .then(res => {
      let r = res.json();
      return r;
    })
    .catch(e => console.error(e))
    .then(res => {
      console.log(res);
      restaurantStore = Object.assign({}, restaurantStore, {
        reviews: res,
        fetchingReviews: false
      });
      reviewsContainer.dispatchEvent(reviewsRender);
    })
    .catch(e => console.error(e))
    .then(_ => requestIdleCallback(() => putReviewsInIDB(restaurantStore.reviews, restaurantStore.restaurant.id)))
    .catch(e => console.error(e));
}

/**
 * Handles state of application when offline post is requested
 */
const initOfflinePost = () => {
  window.removeEventListener('offline', _listenerOffline);
  window.addEventListener('online', _listenerOnline);
  document.dispatchEvent(postOffline);
}

/**
 * Sends online post requests
 * And handles state of application on success or failure
 * @param {Object|boolean} formWithInfo 
 */
const initOnlinePost = (formWithInfo) => {
  window.removeEventListener('online', _listenerOnline);
  window.addEventListener('offline', _listenerOffline)
  typeof formWithInfo != 'boolean' ?
    DBHelper.postRequestRemote(formWithInfo.data)
      .then(res => {
        restaurantStore = (!restaurantStore.currentlyConnected || restaurantStore.postTries) ?
          Object.assign({}, restaurantStore, {
            currentlyConnected: true,
            nextPostWaitTime: 0,
            postTriesTotalTime: 0,
            postTries: 1
          }) :
          restaurantStore;
        delete restaurantStore.thingsToPost[0];
        document.dispatchEvent(postSuccess);
      })
      .catch(e => {
        const timedOut = e.message == 'Timed Out';
        restaurantStore = Object.assign({}, restaurantStore, {
          nextPostWaitTime: calculateWaitTime(restaurantStore.postTries, 500)
        });
        console.log(restaurantStore.nextPostWaitTime);
        restaurantStore = timedOut ?
          Object.assign({}, restaurantStore, {
            currentlyConnected: false,
            postTries: restaurantStore.postTries += 1,
            postTriesTotalTime: restaurantStore.postTriesTotalTime += restaurantStore.nextPostWaitTime
          }) :
          restaurantStore;
        console.log(restaurantStore.postTriesTotalTime);
        (timedOut && restaurantStore.postTries <= 6) ?
          document.dispatchEvent(postTimedOut) :
          document.dispatchEvent(postOffline);
      }) :
    DBHelper.postRequestRemote(formWithInfo, restaurantStore.restaurant.id)
      .then(res => {
        restaurantStore.restaurant = Object.assign({}, restaurantStore.restaurant, {
          is_favorite: !restaurantStore.restaurant.is_favorite
        });
        restaurantStore.restaurant.is_favorite ?
          document.dispatchEvent(favoriteSuccess) :
          document.dispatchEvent(unfavoriteSuccess);
      })
      .catch((e) => {
        document.dispatchEvent(favoriteFailure)
      });
}

/**
 * Shows the toast message when a post or other action is made
 * @param {string} message 
 */
const showPostToast = (message) => {
  const toastElement = document.createRange().createContextualFragment(`<div id="toast">${message}</div>`);
  document.getElementsByTagName('body')[0].appendChild(toastElement);
  window.toastTimeout = setTimeout(() => {
    document.getElementsByTagName('body')[0].removeChild(document.getElementById('toast'));
  }, 3000);
}

/**
 * Calculates the waittime for the next post attempt
 * Used when a post request fails for event based
 * Exponential Backoff infrastructure
 * @param {number} attempt 
 * @param {number} delay 
 */
const calculateWaitTime = (attempt, delay) => Math.floor(Math.random() * Math.pow(2, attempt) * delay);
/**
 * Handles state when application goes offline
 * @param {Object} e 
 */
function _listenerOffline(e) {
  restaurantStore.currentlyConnected = false;
  window.postTimeOut && clearTimeout(postTimeOut);
}
/**
 * Handles state when appliation comes online again
 * Specifically when a new post request will occur
 */
function _listenerOnline(e) {
  restaurantStore = Object.assign({}, restaurantStore, {
    currentlyConnected: true,
    nextPostWaitTime: 0,
    postTriesTotalTime: 0,
    postTries: 1
  });
  initOnlinePost(restaurantStore.thingsToPost[0]);
}
/**
 * Toggles classes for favoriting/unfavoriting of a restaurant
 */
const toggleFavorite = () => {
  const favorite = document.getElementById('favorite');
  if (restaurantStore.restaurant.is_favorite) {
    favorite.classList.replace('unfavorited', 'favorited');
  } else {
    favorite.classList.replace('favorited', 'unfavorited');
  }
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
