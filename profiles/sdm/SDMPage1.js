﻿/* global define: true, DataView: true */

define(function (require, exports, module) {
    'use strict';

    var GenericPage = require('profiles/Page');

    function Page(configuration, broadcast) {


        GenericPage.call(this, configuration, broadcast);

        this.type = GenericPage.prototype.TYPE.MAIN;

        if (broadcast)
            this.profile = broadcast.profile;

        if (broadcast && broadcast.data)
            this.parse(broadcast);
    }

    Page.prototype = Object.create(GenericPage.prototype);
    Page.prototype.constructor = Page;

    // Bit field layout
    Page.prototype.BIT_FIELD = {

        DISTANCE_FRACTIONAL : { START_BIT : 4, LENGTH : 4}
        

    };

    // Bit mask to pinpoint BIT_FIELD

    Page.prototype.BIT_MASK = {

        UPPER_NIBBLE: 0xF0,
        LOWER_NIBLE : 0X0F
       
    };

    // Byte layout
    Page.prototype.BYTE = {
        PAGE_NUMBER: 0,
        TIME_FRACTIONAL: 1,
        TIME_INTEGER: 2,
        DISTANCE_INTEGER: 3,
        DISTANCE_FRACTIONAL: 4, // Upper 4 bit
        SPEED_INTEGER: 4,  // Lower nibble
        SPEED_FRACTIONAL: 5,
        STRIDE_COUNT: 6,
        UPDATE_LATENCY: 7
    };

    Page.prototype.UNIT = {
        TIME_FRACTIONAL: 1 / 200, //s
        DISTANCE_FRACTIONAL : 1/16, // m
        SPEED_FRACTIONAL: 1 / 256, // m/s
        UPDATE_LATENCY: 1 / 32 //s
   
    }
     

    Page.prototype.parse = function (broadcast) {
        var data = broadcast.data;
        //  dataView = new DataView(data.buffer);

        this.broadcast = broadcast;
      
        // Byte 0 - page number

        this.number = data[Page.prototype.BYTE.PAGE_NUMBER];

        // Byte 1 - time fractional

        this.timeFractional = data[Page.prototype.BYTE.TIME_FRACTIONAL] * Page.prototype.UNIT.TIME_FRACTIONAL; // s

        // Byte 2 - time integer

        this.timeInteger = data[Page.prototype.BYTE.TIME_INTEGER];
        
        this.time = this.timeInteger + this.timeFractional;

        // Byte 3 - distance integer
        this.distanceInteger = data[Page.prototype.BYTE.DISTANCE_INTEGER]; // m

        // Byte 4 - distance fractional upper 4 bit, speed integer lower 4 bit

        this.distanceFractional = ((data[Page.prototype.BYTE.DISTANCE_FRACTIONAL] & Page.prototype.BIT_MASK.UPPER_NIBBLE) >> Page.prototype.BIT_FIELD.DISTANCE_FRACTIONAL.START_BIT) * Page.prototype.UNIT.DISTANCE_FRACTIONAL; // Upper 4 bit
        this.distance = this.distanceInteger + this.distanceFractional;

        this.speedInteger = data[Page.prototype.BYTE.SPEED_INTEGER] & Page.prototype.BIT_MASK.LOWER_NIBBLE; // lower 4 bit

        // Byte 5 - speed fractional

        this.speedFractional = data[Page.prototype.BYTE.SPEED_FRACTIONAL] * Page.prototype.UNIT.SPEED_FRACTIONAL;   // m/s
        this.speed = this.speedInteger + this.speedFractional;

        // Byte 6 - stride count
        this.strideCount = data[Page.prototype.BYTE.STRIDE_COUNT];

        // Byte 7 - update latency
        this.updateLatency = data[Page.prototype.BYTE.UPDATE_LATENCY] * Page.prototype.UNIT.UPDATE_LATENCY; // s


    };

    Page.prototype.toString = function () {
       

        var msg = this.type + " P# " + this.number+' ',
            UNUSED = 0x00;

        //var convertToMinPrKM = function (speed) {
        //    if (speed === 0)
        //        return 0;
        //    else
        //        return 1 / (speed * 0.06); // 0.06 = 60/1000
        //};

        //var formatToMMSS = function (speed) {
        //    if (speed === 0)
        //        return "00:00";

        //    var minutes = Math.floor(speed);
        //    var seconds = parseInt(((speed - minutes) * 60).toFixed(), 10); // implicit rounding
        //    if (seconds === 60) {
        //        seconds = 0;
        //        minutes += 1;
        //    }

        //    var result = (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);

        //    return result;
        //};


        // Time starts when SDM is powered ON
       
        if (this.time !== UNUSED)
            msg += "SDM Time : " + this.time + " s";
        else
            msg += "SDM Time : 0" + " s";

        if (this.distance !== UNUSED)
            msg += " Distance : " + this.distance + " m";
        else
            msg += " Distance : 0" + " m";

        if (this.speed !== UNUSED)
            msg += " Speed : " + this.speed.toFixed(1) + " m/s ";
              // Removed due to performance considerations
                // + " - " + formatToMMSS(convertToMinPrKM(this.speed)) + " min/km";
        else
            msg += " Speed : 0" + " m/s";

        msg += " Stride count : " + this.strideCount;

        // p. 25 section 6.2.7 Update Latecy . Stride Based Speed and Distance Monitor Device Profile
        // "represents the time from the end of the last motion event to the time at which the message was transmitted. This time includes computation time
        // as well as the delay before the message is actually transmitted, which depends on the message rate"
        // update latency = last motion event - transmission of message = computation time + delay before transmission
        if (this.updateLatency !== UNUSED)
            msg += " Update latency : " + this.updateLatency + " s";
        else
            msg += " Update latency : 0" + " s";

        return msg;
    };

    module.exports = Page;

    return module.exports;

});