/* global define: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require,exports,module){
  'use strict';

   var  DeviceProfile = require('../deviceProfile'),
    TempPage0 = require('./TemperaturePage0'),
    TempPage1 = require('./TemperaturePage1');

    function DeviceProfile_ENVIRONMENT(configuration){

        DeviceProfile.call(this, configuration);

        this.initMasterSlaveConfiguration();

        this.requestPageUpdate(DeviceProfile_ENVIRONMENT.prototype.DEFAULT_PAGE_UPDATE_DELAY);

    }

    DeviceProfile_ENVIRONMENT.prototype = Object.create(DeviceProfile.prototype);
    DeviceProfile_ENVIRONMENT.prototype.constructor = DeviceProfile_ENVIRONMENT;

    DeviceProfile_ENVIRONMENT.prototype.DEFAULT_PAGE_UPDATE_DELAY = 5000;

    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_ID = {
        DEVICE_TYPE : 25, // 0x19
        TRANSMISSION_TYPE : 0x05 // Low nibble
    };

    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_PERIOD = {
        DEFAULT : 8192, // 4Hz
        ALTERNATIVE : 65535 // 0.5 Hz low power
    };


//    DeviceProfile_ENVIRONMENT.prototype.channelResponse = function (channelResponse)//{
//            this.log.log('log', 'DeviceProfile ENVIRONMENT', channelResponse, channelResponse.toString());
    //    };


    DeviceProfile_ENVIRONMENT.prototype.getPageNumber = function (broadcast)
    {
        return broadcast.data[0];
    };

    DeviceProfile_ENVIRONMENT.prototype.getPage = function (broadcast)
    {
          var page,
            pageNumber = this.getPageNumber(broadcast);

        switch (pageNumber){

            // Device capabilities - why main page?
            case 0 :

                 page = new TempPage0({logger : this.log },broadcast,this,pageNumber);


                break;

            // Temperature
            case 1:

                 page = new TempPage1({ logger : this.log },broadcast,this,pageNumber);


                break;

        }

        // Environment profile has global pages

        if (!page)
        {
            page = this.getBackgroundPage(broadcast,pageNumber);
        }

        return page;

    };

    module.exports =  DeviceProfile_ENVIRONMENT;
    return module.exports;

});
