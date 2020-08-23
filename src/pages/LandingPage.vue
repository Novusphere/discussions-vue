<template>
  <div>
    <LandingInfo>
      <template v-slot:main>
        <h1 class="mb-4">A new world of Discussions</h1>
        <span>Bringing you the best from anywhere. Be a part of everywhere.</span>
      </template>
      <template v-slot:info="{ reveal }">
        <div v-if="reveal" class="mt-4 mb-4 ml-4 mr-4">
          <p>A whole new atmosphere of freedom. Free to say, to do, to transact and to build together. Built with intensity, built with tenacity and built with freedom and liberty for a better future.</p>
          <p>
            Discussions provides you with the tools to build a community around the world to fulfill your collective vision. It is a community building engine that helps you turn your vision into the future.
            Built with blockchain, and connected with the world, with Discussions you can leverage your Twitter, Telegram, Facebook and LinkedIn communities to build a new world.
          </p>
        </div>
        <div v-else>
          <img src="https://cdn.novusphere.io/static/atmos.png" />
        </div>
      </template>
    </LandingInfo>
  </div>
</template>

<script>
import LandingInfo from "@/components/LandingInfo";

export default {
  name: "LandingPage",
  components: {
    LandingInfo,
  },
  props: {},
  data: () => ({
    reveal: false,
  }),
};
</script>