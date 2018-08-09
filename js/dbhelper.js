/**
 * Common data helper functions.
 */
import {
  fetchRestaurantsFromIDB,
  restaurantsInIDB,
  fetchRestaurantFromIDB
} from './idbhelper.js';

export class DBHelper {

  /**
   * Database URL.
   * Points to restaurants API URL
   * @return {string}
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/`;
  }

  static initDataStore() {
    return restaurantsInIDB().then(val => {
      return val ?
        fetchRestaurantsFromIDB() :
        this.fetchRestaurantsRemote();
    })
  }

  static initRestaurantDataStore(id) {
    return restaurantsInIDB().then(val => {
      return val ?
        fetchRestaurantFromIDB(id) :
        this.fetchRestaurantRemote(id);
    })
  }

  static fetchRestaurantsRemote() {
    return this.fetchRemote(`${this.DATABASE_URL}restaurants`);
  }

  static fetchRestaurantRemote(id) {
    return this.fetchRemote(`${this.DATABASE_URL}restaurants/${id}`);
  }

  /**
   * Fetch all restaurants from the Internet
   */
  static fetchRemote(url, method = 'get', body) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.onerror = reject;
      xhr.onload = function() {
        return resolve({
          json: function() {
            return Promise.resolve(xhr.responseText).then(JSON.parse);
          }
        })
      }
      xhr.open(method, url);
      body ? xhr.send(body) : xhr.send();
    })
  }

  /**
   * Fetch a restaurant by its ID.
   * @param {!Object<?,?>|string} id
   * @param {function(...*)=} callback
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   * @param {!string} cuisine
   * @param {function(...*)=} callback
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   * @param {!string} neighborhood
   * @param {function(...*)=} callback
   * @return {void}
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   * @param {!string} cuisine
   * @param {!string} neighborhood
   * @param {function(...*)=} callback
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   * @param {function(...*)=} callback
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   * @param {function(...*)=} callback
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   * @param {!Object<?,?>} restaurant
   * @return {string}
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   * @param {!Object<?,?>} restaurant
   * @return {string}
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }

  /**
   * Restaurant image URL.
   * @param {!Object<?,?>} restaurant
   * @return {string}
   */
  static imageUrlForRestaurantSmall(restaurant) {
    return (`/img_opt/${restaurant.photograph || restaurant.id}`);
  }

  /**
   * Map marker for a restaurant.
   * @param {!Object<?,?>} restaurant
   * @param {!google.maps.Map} map
   * @return {!Object<?,?>}
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant['latlng'],
      title: restaurant['name'],
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}
