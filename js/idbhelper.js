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

/**
 * Does what it says on the tin
 * @param {number} id 
 */
export function fetchRestaurantFromIDB(id) {
  return dbObject.then(db => {
    if (!db) Promise.resolve();
    const trans = db.transaction("restaurants");
    const store = trans.objectStore("restaurants");
    const restaurant = store.get(~~id);
    return restaurant;
  }).catch(e => console.log("Some error:", e));
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

/**
 * Puts reviews on their associated restaurant object
 * This makes it easier to manage loading reviews offline
 * @param {Array} reviews
 * @param {number} id
 */
export function putReviewsInIDB(reviews, id) {
  return dbObject.then(db => {
    if (!db) return;
    const trans = db.transaction('restaurants', 'readwrite');
    const store = trans.objectStore('restaurants');
    store.get(id)
      .then((restaurant) => {
        restaurant.reviews = reviews;
        store.put(restaurant);
      });
    return trans.complete;
  }).catch(e => "Some error or another: " + e);
}

/**
 * Checks to see if there are restaurants in IDB yet
 * Used to see if we need to fetch them from the network
 */
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
    if(!handleDB.objectStoreNames.contains("restaurants")) {
      let resStore = handleDB.createObjectStore("restaurants", { keyPath: 'id' });
      resStore.createIndex('cuisines', 'cuisine_type');
      resStore.createIndex('neighborhoods', 'neighborhood');
    }
  })
}
