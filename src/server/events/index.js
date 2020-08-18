const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 1000;

const accountEvent = new EventEmitter();

export {
    accountEvent
}