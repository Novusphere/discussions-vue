const ThreadsPlugin = require('threads-plugin');

module.exports = {
  "configureWebpack": {
    plugins: [
      new ThreadsPlugin()
    ]
  },
  "transpileDependencies": [
    "vuetify"
  ]
}