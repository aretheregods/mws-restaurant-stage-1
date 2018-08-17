/**
 * Common data helper functions.
 */
import {
  fetchRestaurantsFromIDB,
  restaurantsInIDB,
  fetchRestaurantFromIDB,
  fetchReviewsFromIDB
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

  static get REQUEST_TIMEOUT_VALUE() {
    return 6;
  }

  static postEvent(name = 'connected', data = { message: 'Your message was sent!' }) {
    const connectionEvent = new CustomEvent(name, {
      bubbles: true,
      detail: data
    });
    window.dispatchEvent(connectionEvent);
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
   * @param {string} id
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

  static fetchReviewsRemote(id) {
    return this.fetchRemote(`${this.DATABASE_URL}reviews/?restaurant_id=${id}`);
  }

  static postReviewRemote(review) {
    return this.fetchRemote(`${this.DATABASE_URL}reviews/`, 'POST', review);
  }

  /**
   * Some browsers are weird with fetch
   * so this is a really simple polyfill
   * with the option for timing out the request
   */
  static fetchRemote(url=this.DATABASE_URL, method = 'GET', body, timeout=0) {
    return new Promise(function(resolve, reject) {
      const xhr = new XMLHttpRequest();
      const requestTimeout = timeout && setTimeout(function() {
        xhr.abort();
        reject;
        DBHelper.postEvent('connectionTimedOut', {
          message: "Your connection seems bad.\nWe saved your message offline.\nWe're retrying...",
          postData: {
            url: url,
            data: body && DBHelper.objFromFormData(body)
          }
        }, timeout * 1000);
      });
      xhr.onerror = reject;
      xhr.onload = function() {
        if (this.status >= 200 && this.status < 300) {
          requestTimeout && clearTimeout(requestTimeout);
          return resolve({
            json: function() {
              return Promise.resolve(xhr.responseText).then(JSON.parse);
            }
          })
        } else {
          reject;
        }
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

  static objFromFormData(formData) {
    let obj = {};
    for (let [k, v] of formData) {
      obj[k] = v;
    }
    return obj;
  }

}
