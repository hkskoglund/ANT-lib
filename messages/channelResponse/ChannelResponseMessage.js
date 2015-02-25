/* global define: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }define(function (require, exports, module){

    'use strict';

    var Message = require('../Message'),
        ChannelResponse = require('../../channel/channelResponse');

    function ChannelResponseMessage(data){

        Message.call(this,data,Message.prototype.CHANNEL_RESPONSE);
    }

    ChannelResponseMessage.prototype = Object.create(Message.prototype);

    ChannelResponseMessage.prototype.constructor = ChannelResponseMessage;

    ChannelResponseMessage.prototype.decode = function ()    {
        this.response = new ChannelResponse(this.content[0],this.content[1],this.content[2]);
    };

    ChannelResponseMessage.prototype.toString = function ()    {
        return Message.prototype.toString.call(this)+  " "+this.response.toString();
    };

    module.exports = ChannelResponseMessage;
    return module.exports;
});
