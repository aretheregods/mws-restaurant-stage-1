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

  /**
   * Fetches main page data somehow and returns it in a promise 
   */
  static initDataStore() {
    return restaurantsInIDB().then(val => {
      return val ?
        fetchRestaurantsFromIDB() :
        this.fetchRestaurantsRemote();
    })
  }

  /**
   * Fetches restaurant page data somehow and returns it in a promise
   * @paramm {string} id
   */
  static initRestaurantDataStore(id) {
    return restaurantsInIDB().then(val => {
      return val ?
        fetchRestaurantFromIDB(id) :
        this.fetchRestaurantRemote(id);
    })
  }

  /**
   * Fetch restaurant data from the internet
   */
  static fetchRestaurantsRemote() {
    return this.fetchRemote(`${this.DATABASE_URL}restaurants`);
  }

  /**
   * Fetch restaurant data from local store
   * @param {string} id
   */
  static fetchRestaurantRemote(id) {
    return this.fetchRemote(`${this.DATABASE_URL}restaurants/${id}`);
  }

  /**
   * Some browsers are weird with fetch
   * So, this is a really simple polyfill
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
