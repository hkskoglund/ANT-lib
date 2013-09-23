"use strict";
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

//var  util = require('util'),
//    Duplex = require('stream').Duplex;

//var events = require('events');
  
// Abstract USB device
function USBDevice(options) {
   // events.EventEmitter.call(this);
    // Stream inherits from event emitter
//    Duplex.call(this, options);
//    this._burstBuffer = new Buffer(0);
}

//USBDevice.prototype = Object.create(events.EventEmitter.prototype, { constructor : { value : USBDevice,
//                                                                        enumerable : false,
//                                                                        writeable : true,
//                                                                        configurable : true } });
//util.inherits(USBDevice, Duplex);
//'function (ctor, superCtor) {\n  ctor.super_ = superCtor;\n  ctor.prototype = Object.create(superCtor.prototype, {\n
//constructor: {\n      value: ctor,\n      enumerable: false,\n      writable: true,\n      configurable: true\n    }\n
//});\n}'

// for event emitter
USBDevice.prototype.EVENT = {

    LOG: 'log',
    ERROR: 'error',
    CLOSED : 'closed'
   
};


USBDevice.prototype.setBurstMode = function (value) {
    this.burstMode = value;
};


USBDevice.prototype.init = function (options,callback) {
    throw new Error('Not implemented - should be overridden in descendat objects in the prototype chain');
};

USBDevice.prototype.exit = function (callback) {

    throw new Error('Not implemented - should be overridden in descendat objects in the prototype chain');
};

USBDevice.prototype.setLogging = function (logging) {
    this._logging = logging;
    if (this._logging)
        this.log('log','USB logging ON');
    else
        this.log('log','USB logging OFF');
};

USBDevice.prototype.log = function (type) {
    
    if (this._logging) {
        if (arguments.length === 2)
            console[type](Date.now(), arguments[1]);
        else
            if (arguments.length === 3)
                console[type](Date.now(), arguments[1], arguments[2]);
        else
            if (arguments.length === 4)
                console[type](Date.now(), arguments[1], arguments[2], arguments[3]);
         else
            if (arguments.length === 5)
                console[type](Date.now(), arguments[1], arguments[2], arguments[3],arguments[4]);
        else
            console[type](Date.now(), arguments);
    }
};

// Sets device timeout in ms.
USBDevice.prototype.setDeviceTimeout = function (timeout) {
    throw new Error('Func. should be overridden in descendant objects');
};

USBDevice.prototype.listen = function (successCallback) {
    throw new Error('Func. shoule be overridden in descendant objects');
};

USBDevice.prototype.transfer = function (chunk, successCallback) {
    throw new Error('Func. shoule be overridden in descendant objects');
};

module.exports = USBDevice;
    
    return module.exports;
});