<template>
  <div>
    <span class="text-h5">{{ timeLeft }}</span>
  </div>
</template>

<script>
// Inspired and modified from:
// https://codepen.io/samanthaming/pen/WgrYZr

function zeroPadded(num) {
  // 4 --> 04
  return num < 10 ? `0${num}` : num;
}

export default {
  name: "Countdown",
  components: {},
  props: {
    end: Date,
  },
  data: () => ({
    timeLeft: "00:00",
    endTime: "0",
  }),
  destroyed() {
    clearInterval(this.intervalTimer);
  },
  created() {
    this.startTimer();
  },
  watch: {
    end() {
      this.startTimer();
    },
  },
  methods: {
    startTimer() {
      clearInterval(this.intervalTimer);
      this.displayTimeLeft();
      this.intervalTimer = setInterval(() => this.displayTimeLeft(), 1000);
    },
    displayTimeLeft() {
      let secondsLeft = Math.max(
        0,
        Math.floor((this.end.getTime() - Date.now()) / 1000)
      );

      if (secondsLeft <= 0) {
        clearInterval(this.intervalTimer);
        this.$emit("done");
      }

      const daysLeft = Math.floor(secondsLeft / 86400);
      const hoursLeft = Math.floor((secondsLeft % 86400) / 3600);
      const minutesLeft = Math.floor((secondsLeft % 3600) / 60);
      const secsLeft = Math.floor(secondsLeft % 60);

      let timeLeft = daysLeft > 0 ? `${daysLeft}d ` : ``;
      timeLeft += `${zeroPadded(hoursLeft)}:${zeroPadded(
        minutesLeft
      )}:${zeroPadded(secsLeft)}`;

      this.timeLeft = timeLeft;
    },
  },
};
</script>