import Vue from 'vue';
import Vuetify from 'vuetify/lib';

Vue.use(Vuetify);

export default new Vuetify({
    theme: {
        themes: {
            light: {
                primary: '#079e99',
                secondary: '#ffffff',
                accent: '#8c9eff',
                error: '#b71c1c',
                background: '#ecf0f1'
            },
            dark: {
                primary: '#079e99',
                secondary: '#000000',
                accent: '#8c9eff',
                error: '#b71c1c',
                background: '#000000'
            },
        },
    },
});
