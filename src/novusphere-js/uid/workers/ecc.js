import ecc from "eosjs-ecc";
import { expose } from "threads/worker";

expose({
    sign: ecc.sign,
    signHash: ecc.signHash
})
