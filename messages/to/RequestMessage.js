"use strict";
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

var ANTMessage = require('message/ANTMessage');

// p.89 "ANT Message Protocol and Usage, rev 5.0b"
// "Valid messages include channel status, channel ID, ANT version, capabilities, event buffer, advanced burst capabilitites/configuration, event filter, and user NVM
function RequestMessage(channel, requestedMessageId, NVMaddr, NVMsize) {

    if (!requestedMessageId)
        throw new TypeError('no request message id. specified');

    var msgBuffer = new Uint8Array([channel || 0, requestedMessageId]);

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.REQUEST;
    this.name = "Request";

    this.channel = channel || 0;
    this.requestedMessageId = requestedMessageId;
    


    // Non Volatile Memory 
    if (typeof NVMaddr !== "undefined" && typeof NVMsize !== "undefined") {
        var NVM_Buffer;
        this.NVMaddr = NVMaddr;
        this.NVMsize = NVMsize;

        NVM_Buffer = new DataView(new ArrayBuffer(3));
        NVM_Buffer.setUint16(0,NVMaddr,true); // Little endian
        NVM_Buffer[2] = NVMsize;
        
        msgBuffer = new Uint8Array([channel || 0, requestedMessageId,0,0,0]);
        msgBuffer.set(new Uint8Array(NVM_Buffer.buffer),2);
        
        

    } 
    
    this.setContent(msgBuffer.buffer);

 //console.log("RequestMessage", this);

}

RequestMessage.prototype = Object.create(ANTMessage.prototype);

RequestMessage.prototype.constructor = RequestMessage;

RequestMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " requested msg. id " + this.requestedMessageId + " NVMaddr " + this.NVMaddr + "NVMsize" + this.NVMsize;
};

module.exports = RequestMessage;
    return module.exports;
});