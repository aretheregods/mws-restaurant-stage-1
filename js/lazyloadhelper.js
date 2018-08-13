/**
 * Helper class for lazy loading offscreen images
 * Adapted/borrowed from that one guy - Paul Lewis (?) -
 * @google
 */
export class LazyLoadHelper {

    static get CAN_USE_INTERSECTION() {
        return ('IntersectionObserver' in window);
    }

    static get IMAGE_CLASS() {
        return 'loaded';
    }

    static get THRESHOLD() {
        return 0.50;
    }

    static init() {
        if (this._instance) {
            this._instance._disconnect();
        }

        this._toLoad = 0;
        this._instance = new LazyLoadHelper();
    }

    constructor() {
        const images = document.getElementById("restaurants-list").querySelectorAll('.restaurant-img');
        const config = {
            rootMargin: "0px",
            threshold: LazyLoadHelper.THRESHOLD
        };

        if (!LazyLoadHelper.CAN_USE_INTERSECTION) {
            this._regularLoad(images);
            return;
        }

        this._toLoad = images.length;
        this._onIntersection = this._onIntersection.bind(this);
        this._observer = new IntersectionObserver(this._onIntersection, config);
        images.forEach(image => {
            if(image.classList[1]) {
                return;
            }
            
            this._observer.observe(image);
        })
    }

    _disconnect() {
        if (!this._observer) {
            return;
        }

        this._observer.disconnect();
    }

    _regularLoad(images) {
        Array.from(images).forEach(image => LazyLoadHelper._preload(image))
    }
    
    _onIntersection(pictures) {
        pictures.forEach(picture => {
            if (picture.intersectionRatio < 0.5) {
                return;
            }

            this._toLoad--;
            this._observer.unobserve(picture.target);
            this._preload(picture.target)
        })

        if (this._toLoad > 0) {
            return;
        }

        this._observer.disconnect();
    }

    _preload(image) {
        const src = image.dataset.src;
        if (!src) {
            return;
        }

        return this._showImage(image, src);
    }

    _showImage(match, src) {
        match.classList.add(LazyLoadHelper.IMAGE_CLASS);
        match.src = src;
    }
}