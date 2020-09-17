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
    <LandingInfo>
      <template v-slot:main>
        <h1 class="mb-4">Getting Starting</h1>
        <span>no description provided</span>
      </template>
      <template v-slot:info="{ reveal }">
        <div v-if="reveal" class="mt-4 mb-4 ml-4 mr-4">
          <p>
            <a
              href="https://discussions.app/tag/faq/quvwb1feu9hg/faq-working-guide-to-discussions-app"
              target="_blank"
            >FAQ</a>
          </p>
        </div>
        <div v-else>
          <v-icon color="primary" size="256px">engineering</v-icon>
        </div>
      </template>
    </LandingInfo>
    <LandingInfo>
      <template v-slot:main>
        <h1 class="mb-4">Get ATMOS</h1>
        <span>no description provided</span>
      </template>
      <template v-slot:info="{ reveal }">
        <div v-if="reveal" class="mt-4 mb-4 ml-4 mr-4">
          <p>
            <v-list>
              <v-list-item>
                <a
                  href="https://www.probit.com/app/exchange/ATMOS-BTC"
                  target="_blank"
                >Probit - ATMOS/BTC</a>
              </v-list-item>
              <v-list-item>
                <a
                  href="https://newdex.io/kline/novusphereio-atmos-eos"
                  target="_blank"
                >NewDex - ATMOS/EOS</a>
              </v-list-item>
            </v-list>
          </p>
        </div>
        <div v-else>
          <v-icon color="primary" size="256px">trending_up</v-icon>
        </div>
      </template>
    </LandingInfo>
    <LandingInfo>
      <template v-slot:main>
        <h1 class="mb-4">About Us</h1>
        <span>no description provided</span>
      </template>
      <template v-slot:info="{ reveal }">
        <div v-if="reveal" class="mt-4 mb-4 ml-4 mr-4">
          <p>
            <v-list>
              <v-list-item>
                <a href="https://discussions.app/u/xia256-WFSe/" target="_blank">xia256</a>
              </v-list-item>
              <v-list-item>
                <a href="https://discussions.app/u/Jacques-nYYH/" target="_blank">Jacques</a>
              </v-list-item>
              <v-list-item>
                <a href="https://discussions.app/u/Brian_Novusphere-cpjV/" target="_blank">Brian</a>
              </v-list-item>
              <v-list-item>
                <a href="https://discussions.app/u/Novusphere_Paul-Dx5o/" target="_blank">Paul</a>
              </v-list-item>
            </v-list>
          </p>
        </div>
        <div v-else>
          <v-icon color="primary" size="256px">groups</v-icon>
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