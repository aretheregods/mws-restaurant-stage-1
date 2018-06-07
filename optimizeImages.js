const imagemin = require('imagemin');
const imageminMozJPEG = require('imagemin-mozjpeg');

(async () => {
    await imagemin(['img/*.jpg'], 'img_opt', {
        use: [
            imageminMozJPEG({
                progressive: true,
                quality: 30
            })
        ]
    })
    .then(() => console.log("Images Optimized"))
    .catch(() => console.error("Error: Images not optimized"));
})();
