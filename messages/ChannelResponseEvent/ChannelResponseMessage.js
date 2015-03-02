/* global define: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }define(function (require, exports, module){

    'use strict';

    var Message = require('../Message'),
        ChannelResponseEvent = require('../../channel/channelResponseEvent');

    function ChannelResponseMessage(data)    {

        Message.call(this,data,Message.prototype.CHANNEL_RESPONSE);
    }

    ChannelResponseMessage.prototype = Object.create(Message.prototype);

    ChannelResponseMessage.prototype.constructor = ChannelResponseMessage;

    ChannelResponseMessage.prototype.decode = function ()    {
      var initiatingId = this.payload[0],
          code = this.payload[1];

      this.response = new ChannelResponseEvent(this.channel,initiatingId,code);

    };

    ChannelResponseMessage.prototype.toString = function ()    {
        return Message.prototype.toString.call(this)+  " "+this.response.toString();
    };

    module.exports = ChannelResponseMessage;
    return module.exports;
});
