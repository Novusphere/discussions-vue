import { Controller, Get, Post } from '@decorators/express';
import { Api } from "../helpers";
import { config, getDatabase } from "../mongo";

@Controller('/moderation')
export default class ModerationController {
    constructor() {
    }
}