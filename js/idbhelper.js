import idb from 'idb';

/**
 * Helper Class for IDB stuff
 */
export class IDBHelper {
  /**
 	 * Name of the database to use
 	 */
  static get DB_NAME() {
    return 'restaurants-db';
  }

  /**
   * Current version number of DB
   */
  static get DB_VERSION() {
    return 1;
  }

  /**
   * Name of restaurant store in database
   */ 
  static get STORE_NAME() {
    return 'restaurants';
  }

  static get _DBObject() {
    return IDBHelper.openIDBInstance();
  }

  static openIDBInstance() {
    // Check that indexeddb is available
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }

    return idb.open(IDBHelper.DB_NAME, IDBHelper.DB_VERSION, handleDB => {
      if(!handleDB.objectStoreNames.contains(IDBHelper.STORE_NAME)) {
        let store = handleDB.createStore(IDBHelper.STORE_NAME, {keyPath: 'id'}).
        store.createIndex('cuisines', 'cuisine_type');
        store.createIndex('neighborhoods', 'neighborhood');
      }
    })  
  }

  static putRestaurantsInIDB(restaurants) {
    IDBHelper._DBObject.then(db => {
      if(!db) return;
      const trans = db.transaction('restaurants', 'readwrite');
      const store = trans.objectStore('restaurants');
      restaurants.forEach(restaurant => {
        store.put(restaurant);
      })
    })
  }

  static fetchRestaurantsFromIDB() {
    return IDBHelper._DBObject.then(db => {
      if(!db) return;
      return db.transaction('restaurants').objectStore('restaurants').getAll();
    })
  }

}