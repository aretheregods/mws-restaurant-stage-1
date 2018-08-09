/**
 * Helper Functions for IDB stuff
 */
import idb from "idb";

let dbObject = _openIDBInstance();

/**
 * Fetch all restaurants from IDB
 * @return {object|null|void}
 */
export function fetchRestaurantsFromIDB(callback) {
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
        })
      } else {
        return;
      }
    })
  }).catch(e => "Some error or another: " + e);
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

  return idb.open("restaurants", 1, handleDB => {
    if(!handleDB.objectStoreNames.contains("restaurants")) {
      let store = handleDB.createObjectStore("restaurants", { keyPath: 'id' });
      store.createIndex('cuisines', 'cuisine_type');
      store.createIndex('neighborhoods', 'neighborhood');
      return store;
    }
  })
};
