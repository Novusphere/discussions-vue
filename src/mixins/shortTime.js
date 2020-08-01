import { formatDistance } from "date-fns";

export const shortTimeMixin = {
    methods: {
        shortTime(t) {
            if (!this.$vuetify.breakpoint.mobile)
                return formatDistance(t, new Date(), { addSuffix: true });
            else {
                const delta = Date.now() - t;
                const second = 1000;
                const minute = second * 60;
                const hour = minute * 60;
                const day = hour * 24;

                let unit = (u, s) => {
                    const n = Math.max(1, Math.ceil(delta / u));
                    return `${n}${s}`;
                };

                if (delta < minute) return unit(second, `s`);
                else if (delta < hour) return unit(minute, `m`);
                else if (delta < day) return unit(hour, `h`);
                else return unit(day, `d`);
            }
        },
    }
}