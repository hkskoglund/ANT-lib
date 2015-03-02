/* global define: true, DataView: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(function (require, exports, module){

      'use strict';

  var Message = require('../Message'),
      ChannelId = require('./channelId');

  function ChannelIdMessage()  {

      Message.call(this,undefined,Message.prototype.CHANNEL_ID);

  }

  ChannelIdMessage.prototype = Object.create(Message.prototype);

  ChannelIdMessage.prototype.constructor = ChannelIdMessage;


  ChannelIdMessage.prototype.decode = function (data)  {

      this.channelId = new ChannelId(new DataView(this.payload).getUint16(0,true), this.payload[2], this.payload[3]);

  };

  ChannelIdMessage.prototype.toString = function ()  {
      return Message.prototype.toString.call(this)+ " Ch " + this.channel + " " + this.channelId.toString();
  };

    module.exports = ChannelIdMessage;
    return module.exports;
});
