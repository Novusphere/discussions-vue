import { Controller, Get, Post } from '@decorators/express';
import { Api } from "../helpers";
import { config, getDatabase } from "../mongo";

import Identicon from 'identicon.js'
import { PublicKey } from 'eosjs-ecc'

@Controller('/data')
export default class DataController {
    constructor() {
    }

    @Api()
    @Get("/keyicon/:publicKey")
    async publicKeyIcon(req, res) {
        let { publicKey, dark } = req.unpack();
        const dot = publicKey.indexOf('.');
        if (dot > -1) {
            // remove the .svg
            publicKey = publicKey.substring(0, dot);
        }

        const options = {
            //foreground: [0, 0, 0, 255],  // rgba black
            background: dark ? [0, 0, 0, 255] : [255, 255, 255, 255],
            //margin: 0.2,  // 20% margin
            size: 420, // 420px square
            format: 'svg' // use SVG instead of PNG
        };

        const icon = new Identicon(PublicKey.fromString(publicKey).toHex(), options).toString(true);
        res.setHeader('content-type', 'image/svg+xml');
        return res.send(icon);
    }
}