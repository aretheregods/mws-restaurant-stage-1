const path = require('path');
const CleanBuild = require('clean-webpack-plugin')

const ENV = process.env.NODE_ENV;

module.exports = {
	entry: {
		main: './js/main.js',
		"restaurant_info": './js/restaurant_info.js'
	},
	plugins: [
        new CleanBuild(['build'])
	],
	output: {
		filename: '[name].min.js',
		path: path.resolve('./build')
	},
	module: {
		rules: [
		{ test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }
		]
	},
	resolve: {
		modules: ['node_modules']
	}
}