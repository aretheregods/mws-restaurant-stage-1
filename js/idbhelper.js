/**
 * Helper Functions for IDB stuff
 */
import idb from "idb";

let dbObject = _openIDBInstance();

/**
 * Fetch all restaurants from IDB
 * @return {object|null|void}
 */
export function fetchRestaurantsFromIDB() {
  return dbObject.then(db => {
    if (!db) Promise.resolve();
    const trans = db.transaction("restaurants");
    const store = trans.objectStore("restaurants")
    const restaurants = store.getAll();
    return restaurants;
  }).catch(e => console.log("Some error:", e));
}

export function fetchRestaurantFromIDB(id) {
  return dbObject.then(db => {
    if (!db) Promise.resolve();
    const trans = db.transaction("restaurants");
    const store = trans.objectStore("restaurants");
    const restaurant = store.get(~~id);
    return restaurant;
  }).catch(e => console.log("Some error:", e));
}

export function fetchReviewsFromIDB(id) {
  return dbObject.then(db => {
    if (!db) return;
    const trans = db.transaction('reviews');
    const store = trans.objectStore('reviews');
    const index = store.index('restaurant_id');
    const reviews = index.get(String(id));
    return reviews;
  }).catch(e => console.error("Some error:", e))
}

export function fetchReviewsToPostFromIDB(id) {
  return dbObject.then(db => {
    if (!db) return;
    const trans = db.transaction('reviewsToPost');
    const store = trans.objectStore('reviewsToPost');
    const index = store.index('restaurant_id');
    const reviews = index.get(String(id));
    return reviews;
  }).catch((e) => console.error("Some error", e));
}

/**
 * Adding records to the DB store
 * @param {Array} restaurants
 */
export function putRestaurantsInIDB(restaurants) {
  return dbObject.then(db => {
    if (!db) return;
    const trans = db.transaction('restaurants', 'readwrite');
    const store = trans.objectStore('restaurants');
    return store.count().then(val => {
      if (!val) {
        restaurants.forEach(restaurant => {
          store.put(restaurant);
        });
      } else {
        return;
      }
    })
  }).catch(e => "Some error or another: " + e);
}

export function putReviewsInIDB(reviews) {
  return dbObject.then(db => {
    if (!db) return;
    const trans = db.transaction('reviews', 'readwrite');
    const store = trans.objectStore('reviews');
    reviews.forEach(review => store.put(review));
    return trans.complete;
  }).catch(e => "Some error or another: " + e);
}

export function putReviewInIDB(review) {
  return dbObject.then(db => {
    if (!db) return;
    const trans = db.transaction('reviews', 'readwrite');
    const store = trans.objectStore('reviews');
    store.put(review);
    return trans.complete;
  }).catch(e => console.error(e));
}


export function restaurantsInIDB() {
  return dbObject.then(db => {
    if (!db) Promise.resolve();
    const counted = db.transaction('restaurants');
    const countedStore = counted.objectStore('restaurants');
    const value = countedStore.count()
    return value;
  }).catch(e => { return e});
}

function _openIDBInstance() {
  // Check that indexeddb is available
  if (!navigator.serviceWorker) {
    return Promise.resolve();
  }

  return idb.open("restaurants", 2, handleDB => {
    switch (handleDB.oldVersion) {
      case 0:
        if(!handleDB.objectStoreNames.contains("reviews")) {
          let revStore = handleDB.createObjectStore("reviews", { keyPath: 'id' });
          revStore.createIndex('restaurant_id', 'restaurant_id');
        }
      case 1:
        if(!handleDB.objectStoreNames.contains("reviewsToPost")) {
          let revPostStore = handleDB.createObjectStore("reviewsToPost", { keyPath: 'id' });
          revPostStore.createIndex('restaurant_id', 'restaurant_id');
        }
      case 2:
        if(!handleDB.objectStoreNames.contains("restaurants")) {
          let resStore = handleDB.createObjectStore("restaurants", { keyPath: 'id' });
          resStore.createIndex('cuisines', 'cuisine_type');
          resStore.createIndex('neighborhoods', 'neighborhood');
        }
    }
  })
};
