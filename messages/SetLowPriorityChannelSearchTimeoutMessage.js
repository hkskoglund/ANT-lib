/* global define: true, Uint8Array: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

    "use strict";

    var Message = require('./Message');
        //LowPrioritySearchTimeout = require('messages/LowPrioritySearchTimeout');

    function SetLowPrioriyChannelSearchTimeoutMessage(channel, searchTimeout) {

        var msgBuffer = new Uint8Array(2);

        msgBuffer[0] = channel;

        if (typeof searchTimeout !== 'number')
              msgBuffer[1] = searchTimeout.getRawValue();
            else
                msgBuffer[1] = searchTimeout;

        Message.call(this);

        this.id = Message.prototype.MESSAGE.SET_LOW_PRIORITY_CHANNEL_SEARCH_TIMEOUT;

        this.setContent(msgBuffer.buffer);

        this.LPsearchTimeout = searchTimeout;
    }

    SetLowPrioriyChannelSearchTimeoutMessage.prototype = Object.create(Message.prototype);

    SetLowPrioriyChannelSearchTimeoutMessage.prototype.constructor = SetLowPrioriyChannelSearchTimeoutMessage;


    SetLowPrioriyChannelSearchTimeoutMessage.prototype.toString = function () {
        return this.name + " ID 0x" + this.id.toString(16);
    };

    module.exports = SetLowPrioriyChannelSearchTimeoutMessage;
    return module.exports;
});
