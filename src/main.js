// Primarily written and maintained by [bed8c66e8c0c903cf91946f9f625fd9de3b8556972141ee60694faa19d1812da]

import Vue from 'vue';
import vuetify from './plugins/vuetify';
import router from './plugins/router';
import store from './plugins/vuex';
import App from './App.vue';

import * as axios from 'axios';
window._axios = axios;

import VueClipboard from 'vue-clipboard2'
Vue.use(VueClipboard);

import InfiniteLoading from 'vue-infinite-loading';
Vue.use(InfiniteLoading, { /* options */ });

import 'viewerjs/dist/viewer.css';
import Viewer from 'v-viewer';
Vue.use(Viewer, {
  defaultOptions: {
    "title": false,
    "movable": false,
    "rotatable": false, 
    "scalable": false
  }
})

Vue.config.productionTip = false;

window.$vue = new Vue({
  vuetify,
  router,
  store,
  render: h => h(App)
}).$mount('#app');