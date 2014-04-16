/* global define: true, DataView: true */

define(['profiles/Page'], function _requireDefineBikeCadPage0(GenericPage) {

    'use strict';

    function BikeCadPage0(configuration, broadcast, previousPage) {

        GenericPage.call(this, configuration);

        this.type = GenericPage.prototype.TYPE.MAIN;

        this.previousPage = previousPage;

        this.timestamp = broadcast.timestamp || Date.now();

        //this.profile = broadcast.profile;

        if (broadcast.data)
            this.parse(broadcast);

    }

    BikeCadPage0.prototype = Object.create(GenericPage.prototype);
    BikeCadPage0.prototype.constructor = BikeCadPage0;

    BikeCadPage0.prototype.parse = function (broadcast) {

        var data = broadcast.data,
            dataView = new DataView(data.buffer),
            cumulativeCadenceRevolutionCountRollover,
            cumulativeSpeedRevolutionCountRollover,
            bikeCadenceEventTimeRollover,

            bikeCadenceEventTimeDifference,
            diffCumulativeSpeedRevolutionCountCount;

        this.broadcast = broadcast;

        /*// NB No page number available in data message

        this.number = 0;

        // Byte 0-1 - Bike Cadence Event Time LSB MSB - last valid bike cadence event - unit: 1/1024s - rollover : 64 s

        this.bikeCadenceEventTime = dataView.getUint16(data.byteOffset + .BYTE.BIKE_CADENCE_EVENT_TIME, true);

        // Byte 2-3 - Cumulative Cadence Revolution Count LSB MSB - total number of pedal revolutions - rollover : 65536

        this.cumulativeCadenceRevolutionCount = dataView.getUint16(data.byteOffset + BikeCadPage0.prototype.BYTE.CUMULATIVE_CADENCE_REVOLUTION_COUNT, true);

        // Byte 4-5 - Bike speed event time LSB MSB - time of last valid bike speed event - unit : 1/1024 s, 64 s

        this.bikeSpeedEventTime = dataView.getUint16(data.byteOffset + BikeCadPage0.prototype.BYTE.BIKE_SPEED_EVENT_TIME, true);

        // Byte 6-7 - Cumulative Speed Revolution LSB MSB - total number of wheel revolutions - rollover : 65536

        this.cumulativeSpeedRevolutionCount = dataView.getUint16(data.byteOffset + BikeCadPage0.prototype.BYTE.CUMULATIVE_SPEED_REVOLUTION_COUNT, true);
*/

        this.readCommonBytes(data,dataView);

        // Initialy we have no previous page, so have to check for previous page
        if (!this.previousPage)
          return;

        // Don't attempt to calculate cadence and speed if time between pages is greater than rollover time
        if (this.timestamp - this.previousPage.timestamp >= 64000) {
            if (this.log.logging) this.log.log('warn', 'Time between pages from is over rollover threshold, skipped cadence and speed calculation', this.page, this.previousPage);
            return;
        }

        cumulativeCadenceRevolutionCountRollover = (this.cumulativeCadenceRevolutionCount < this.previousPage.cumulativeCadenceRevolutionCount);

        cumulativeSpeedRevolutionCountRollover = (this.cumulativeSpeedRevolutionCount < this.previousPage.cumulativeSpeedRevolutionCount);

        bikeCadenceEventTimeRollover = (this.bikeCadenceEventTime < this.previousPage.bikeCadenceEventTime);



        if (bikeCadenceEventTimeRollover)
            bikeCadenceEventTimeDifference = 0xFFFF + (this.bikeCadenceEventTime - this.previousPage.bikeCadenceEventTime);
        else
            bikeCadenceEventTimeDifference = this.bikeCadenceEventTime - this.previousPage.bikeCadenceEventTime;

        // RPM - rounds pr minute

        // CADENCE

        if (bikeCadenceEventTimeDifference) {
            if (cumulativeCadenceRevolutionCountRollover)
                this.cadence = 61440 * (0xFFFF - this.cumulativeCadenceRevolutionCount + this.previousPage.cumulativeCadenceRevolutionCount) / bikeCadenceEventTimeDifference;
            else
                this.cadence = 61440 * (this.cumulativeCadenceRevolutionCount - this.previousPage.cumulativeCadenceRevolutionCount) / bikeCadenceEventTimeDifference;
        }


        // Filter "spikes"
        // This issue has been noticed running the SimulANT+ application Version : AYD 1.5.0.0
        // Its only the first few packets that provokes this for unCalibratedSpeed


        if (this.cadence > 512) {
            if (this.log && this.log.logging)
                this.log.log('warn', 'Very high cadence filtered', this);
            this.cadence = undefined;

        }

    };

    BikeCadPage0.prototype.toString = function () {

        var calibrationFactor = 2.07, // Just used for a speed estimate
            speed,
            msg;

        msg = this.type + " P# " + this.number + " cadence (rpm) ";

        if (this.cadence !== undefined)
            msg += this.cadence;

        msg +=  " cadenceEventTime " + this.bikeCadenceEventTime + ' cadenceRevolution ' + this.cumulativeCadenceRevolutionCount;


        return msg;
    };

    return BikeCadPage0;

});
