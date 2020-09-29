<template>
  <div>
    <v-row no-gutters>
      <v-col :cols="6">
        <v-carousel
          v-model="item"
          cycle
          height="400"
          hide-delimiter-background
          show-arrows-on-hover
        >
          <v-carousel-item>
            <v-card
              height="400"
              color="primary"
              flat
              class="rounded-0 d-flex justify-center align-center"
            >
              <v-card-text>
                <div class="mt-4 mb-4 ml-4 mr-4">
                  <h1 class="mb-4">A new world of Discussions</h1>
                  <p>Bringing you the best from anywhere. Be a part of everywhere.</p>
                </div>
              </v-card-text>
            </v-card>
          </v-carousel-item>
          <v-carousel-item>
            <v-card
              height="400"
              color="primary"
              flat
              class="rounded-0 d-flex justify-center align-center"
            >
              <v-card-text>
                <div class="mt-4 mb-4 ml-4 mr-4">
                  <h1 class="mb-4">Getting Starting</h1>
                  <p>Tips and tricks for making the most out of Discussions.</p>
                </div>
              </v-card-text>
            </v-card>
          </v-carousel-item>
          <v-carousel-item>
            <v-card
              height="400"
              color="primary"
              flat
              class="rounded-0 d-flex justify-center align-center"
            >
              <v-card-text>
                <div class="mt-4 mb-4 ml-4 mr-4">
                  <h1 class="mb-4">Get ATMOS</h1>
                  <p></p>
                </div>
              </v-card-text>
            </v-card>
          </v-carousel-item>
          <v-carousel-item>
            <v-card
              height="400"
              color="primary"
              flat
              class="rounded-0 d-flex justify-center align-center"
            >
              <v-card-text>
                <div class="mt-4 mb-4 ml-4 mr-4">
                  <h1 class="mb-4">About Us</h1>
                  <p>The Novusphere is a nimble team building open software and leveraging emerging technology to unite blockchains and put users in control of the next wave of connected applications.</p>
                </div>
              </v-card-text>
            </v-card>
          </v-carousel-item>
        </v-carousel>
      </v-col>
      <v-col :cols="6">
        <v-card height="400" flat class="rounded-0 d-flex justify-center align-center">
          <v-card-text>
            <div v-if="!reveal" class="d-flex justify-center align-center">
              <img src="https://cdn.novusphere.io/static/atmos.png" />
            </div>
            <div v-else class="mt-4 mb-4 ml-4 mr-4">
              <div v-if="item == 0">
                <p>A whole new atmosphere of freedom. Free to say, to do, to transact and to build together. Built with intensity, built with tenacity and built with freedom and liberty for a better future.</p>
                <p>
                  Discussions provides you with the tools to build a community around the world to fulfill your collective vision. It is a community building engine that helps you turn your vision into the future.
                  Built with blockchain, and connected with the world, with Discussions you can leverage your Twitter, Telegram, Facebook and LinkedIn communities to build a new world.
                </p>
              </div>
              <div v-else-if="item == 1"></div>

              <div v-else-if="item == 2"></div>
              <div v-else-if="item == 3">
                <v-list>
                  <v-list-item>
                    <UserProfileLink
                      class="d-inline mr-2"
                      :publicKey="'EOS5FcwE6haZZNNTR6zA3QcyAwJwJhk53s7UjZDch1c7QgydBWFSe'"
                      :displayName="'xia256'"
                    ></UserProfileLink>
                    <span>- Chief Technical Officer</span>
                  </v-list-item>
                  <v-list-item>
                    <UserProfileLink
                      class="d-inline mr-2"
                      :publicKey="'EOS5epmzy9PGex6uS6r6UzcsyxYhsciwjMdrx1qbtF51hXhRjnYYH'"
                      :displayName="'Jacques'"
                    ></UserProfileLink>
                    <span>- Title</span>
                  </v-list-item>
                  <v-list-item>
                    <UserProfileLink
                      class="d-inline mr-2"
                      :publicKey="'EOS6sYMyMHzHhGtfwjCcZkRaw3YK5ws8xoD6ke2DNUmnHT3j1cpjV'"
                      :displayName="'Brian'"
                    ></UserProfileLink>
                    <span>- Chief Financial Officer</span>
                  </v-list-item>
                  <v-list-item>
                    <UserProfileLink
                      class="d-inline mr-2"
                      :publicKey="'EOS7RWM4YvxcUEhZfHozf8XVajgvfh8wvohoJS9vx8Hg1K12PDx5o'"
                      :displayName="'Paul'"
                    ></UserProfileLink>
                    <span>- Title</span>
                  </v-list-item>
                </v-list>
              </div>
            </div>
            <v-btn block dense text @click="reveal = !reveal">
              <v-icon>{{ reveal ? 'mdi-close-circle-outline' : 'mdi-plus-circle-outline' }}</v-icon>
              <span v-show="!reveal">More</span>
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
//import LandingInfo from "@/components/LandingInfo";
import UserProfileLink from "@/components/UserProfileLink";

export default {
  name: "LandingPage",
  components: {
    //LandingInfo,
    UserProfileLink,
  },
  props: {},
  data: () => ({
    item: 0,
    reveal: false,
  }),
};
</script>