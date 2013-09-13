"use strict";

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

var ANTMessage = require('../ANTMessage.js'),
    Channel = require('../../channel.js');


function AssignChannelMessage(channel,channelType,networkNumber,extendedAssignment) {
    //console.log("Assign channel msg args", arguments);

    var msgBuffer;
    
    if (extendedAssignment)
        msgBuffer = new UInt8Array([channel,channelType,networkNumber,extendedAssignment]);
    else
        msgBuffer = new UInt8Array([channel, channelType, networkNumber]);

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.ASSIGN_CHANNEL;
    this.name = "Assign Channel";

    this.channel = channel;
    this.channelType = channelType;
    this.networkNumber = networkNumber;
    this.extendedAssignment = extendedAssignment;

    this.setContent(msgBuffer.buffer);

    //console.log("AssignChannelMessage", this);

}

AssignChannelMessage.prototype = Object.create(ANTMessage.prototype);

AssignChannelMessage.prototype.constructor = AssignChannelMessage;

AssignChannelMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " N# " + this.networkNumber + " " + Channel.prototype.TYPE[this.channelType] + " extended assignment " + this.extendedAssignment;
};

module.exports = AssignChannelMessage;
return module.exports;
});