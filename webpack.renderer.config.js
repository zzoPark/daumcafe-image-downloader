const rules = require('./webpack.rules');

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

rules.push({
  test: /\.scss$/,
  use: [
    { loader: 'style-loader' }, 
    { loader: 'css-loader' },
    { 
      loader: 'postcss-loader',
      options: {
        postcssOptions: {
          plugins: () => [ require('autoprefixer') ]
        }
      }
    },
    { loader: 'sass-loader' },
  ],
});

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
};
