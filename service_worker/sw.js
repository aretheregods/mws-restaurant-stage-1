/**
* Borrowed in part from
* Mozilla's serviceworke.rs site
* But altered to fit these purposes
**/
const CACHE_NAME = 'restaurants';
const CACHE_VERSION = 3;

self.addEventListener('install', function(evt) {
  evt.waitUntil(precache());
});

self.addEventListener('fetch', function(evt) {
  let request = evt.request.clone();
  
  if (!request.url.endsWith('/restaurants')) {
    evt.respondWith(fromCache(request));
    evt.waitUntil(update(request));
  }
});

function precache() {
  return caches.open(CACHE_NAME + CACHE_VERSION).then(function (cache) {
    return cache.addAll([
      './index.html',
      './restaurant.html',
      './build/main.min.js',
      './build/restaurant_info.min.js',
      './build/styles.min.css',
      './build/restaurant.min.css',
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

function fromCache(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request).then(function (matching) {
      return matching ? matching : fetch(request);
    });
  });
}

function update(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return fetch(request).then(function (response) {
      return cache.put(request, response);
    });
  });
}
