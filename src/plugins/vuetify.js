import Vue from 'vue';
import Vuetify from 'vuetify/lib';

Vue.use(Vuetify);

export default new Vuetify({
    options: {
        customProperties: true
    },
    theme: {
        dark: true,
        themes: {
            light: {
                primary: '#079e99',
                secondary: '#ffffff',
                accent: '#49C193',
                error: '#b71c1c',
                background: '#ecf0f1'
            },
            dark: {
                primary: '#079e99',
                secondary: '#000000',
                accent: '#49C193',
                error: '#b71c1c',
                background: '#000000'
            },
        },
    },
});
