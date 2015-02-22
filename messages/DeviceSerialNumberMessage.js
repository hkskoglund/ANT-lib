/* global define: true, DataView: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

    var  Message = require('./Message');

    function DeviceSerialNumberMessage(data)
    {
        Message.call(this,data);
    }

    DeviceSerialNumberMessage.prototype = Object.create(Message.prototype);

    DeviceSerialNumberMessage.prototype.constructor = DeviceSerialNumberMessage;

    DeviceSerialNumberMessage.prototype.decode = function (data)
    {
        // SN 4 bytes Little Endian
        var dw = new DataView(this.content.buffer);

        this.serialNumber = dw.getUint32(this.content.byteOffset,true);
        this.serialNumberAsChannelId = dw.getUint16(this.content.byteOffset,true); // Lower 2-bytes
    };

    DeviceSerialNumberMessage.prototype.toString = function (){
        return Message.prototype.toString.call(this)+ " " + this.serialNumber+' (0x'+this.serialNumber.toString(16)+')'+" lower 2-bytes "+this.serialNumberAsChannelId +' (0x'+this.serialNumberAsChannelId.toString(16)+')';
    };

    module.exports = DeviceSerialNumberMessage;
    return module.exports;
});
