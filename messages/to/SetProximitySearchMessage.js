﻿"use strict"

var ANTMessage = require('../ANTMessage.js');


function SetProximitySearchMessage(channel, searchThreshold) {

    var msgBuffer = new Buffer(2);
        
    msgBuffer[0] = channel;
    msgBuffer[1] = searchThreshold; // 0 - disabled, 1:10 - closes to farthest
 

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_PROXIMITY_SEARCH;
    this.name = "Set proximity search";

    this.channel = channel;
    this.searchThreshold = searchThreshold;

    this.setContent(msgBuffer)

    //console.log("SetProximitySearchMessage", this);
}

SetProximitySearchMessage.prototype = Object.create(ANTMessage.prototype);

SetProximitySearchMessage.prototype.constructor = SetProximitySearchMessage;

SetProximitySearchMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " search threshold " + this.searchThreshold;
}

module.exports = SetProximitySearchMessage;