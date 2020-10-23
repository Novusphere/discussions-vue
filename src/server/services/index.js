import discussions from "./discussions";
import analytics from "./analytics";
import { config } from "../mongo";

function start() {
    discussions.start();
    analytics.start();
}

export default {
    start
}