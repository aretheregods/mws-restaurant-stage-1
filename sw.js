var CACHE = 'restaurant-v-1';

self.addEventListener('install', function(evt) {
  console.log('The service worker is being installed.');

  evt.waitUntil(precache());
});

self.addEventListener('fetch', function(evt) {
  console.log('The service worker is serving the asset.');
  
  evt.respondWith(fromCache(evt.request));
  evt.waitUntil(update(evt.request));
});

function precache() {
  return caches.open(CACHE).then(function (cache) {
    return cache.addAll([
      './index.html'
      './restaurant.html',
      './js/dbhelper.js',
      './js/main.js',
      './js/restaurant_info.js',
      './data/restaurants.json',
      './css/styles.css',
      './img_opt/1.jpg',
      './img_opt/2.jpg',
      './img_opt/3.jpg',
      './img_opt/4.jpg',
      './img_opt/5.jpg',
      './img_opt/6.jpg',
      './img_opt/7.jpg',
      './img_opt/8.jpg',
      './img_opt/9.jpg',
      './img_opt/10.jpg'
    ]);
  });
}

// Open the cache where the assets were stored and search for the requested
// resource. Notice that in case of no matching, the promise still resolves
// but it does with `undefined` as value.
function fromCache(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request).then(function (matching) {
      return matching || Promise.reject('no-match');
    });
  });
}

// Update consists in opening the cache, performing a network request and
// storing the new response data.
function update(request) {
  return caches.open(CACHE).then(function (cache) {
    return fetch(request).then(function (response) {
      return cache.put(request, response);
    });
  });
}
