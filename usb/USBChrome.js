﻿/* global define: true, chrome: true, Uint8Array: true,  */

define(['usb/USBDevice'],function (USBDevice) {
    "use strict";
   
    function USBChrome(options) {

        USBDevice.call(this, options);

        if (options && this.log && this.log.logging)
            this.log.log('log', 'USB options', options);

        // All devices that matched vid and pid found in manifest.json permissions
        this.enumeratedManifestDevices = undefined;
    }

    USBChrome.prototype = Object.create(USBDevice.prototype, {
        constructor: {
            value: USBChrome,
            enumerable: false,
            writeable: true,
            configurable: true
        }
    });

    // Assume correspondence between resultCodes and LIBUSB
    USBChrome.prototype.LIBUSB_TRANSFER_COMPLETED = 0;
    USBChrome.prototype.LIBUSB_TRANSFER_ERROR = 1;
    USBChrome.prototype.LIBUSB_TRANSFER_TIMED_OUT = 2;
    USBChrome.prototype.LIBUSB_TRANSFER_CANCELLED = 3;
    USBChrome.prototype.LIBUSB_TRANSFER_STALL = 4;
    USBChrome.prototype.LIBUSB_TRANSFER_NO_DEVICE = 5;
    USBChrome.prototype.LIBUSB_TRANSFER_OVERFLOW = 6;


    USBChrome.prototype.getINendpointPacketSize = function () {
        return this.inEndpoint.maximumPacketSize;
    };

    USBChrome.prototype.transfer = function (chunk, callback) {

        var msg;

        if (!this.outEndpoint) {

            msg = 'Cannot write to out endpoint of device, its undefined, device not initialized properly';
            if (this.log && this.log.logging) this.log.log('error', msg, chunk);
            callback(new Error(msg));
            return;
        }

        var onTX = function (TXinformation) {
            if (TXinformation.resultCode === USBChrome.prototype.LIBUSB_TRANSFER_COMPLETED) {
                //console.log(Date.now(), "Tx", TXinfo);
                callback();
            }
            else {
                if (this.log && this.log.logging) this.log.log('error', "Tx failed", TXinformation);
                callback(new Error(chrome.runtime.lastError));
            }

        }.bind(this);

        var TXinfo = {
            "direction": this.outEndpoint.direction,
            "endpoint": this.outEndpoint.address,
            //"length": this.outEndpoint.maximumPacketSize
            "data": chunk.buffer
        };

        if (this.log && this.log.logging) this.log.log('log', "TX ", TXinfo, chunk);

        chrome.usb.bulkTransfer(this.connectionHandle, TXinfo, onTX);
    };

    USBChrome.prototype.listen = function () {

        var transferErrorCount = 0,
            MAX_TRANSFER_ERROR_COUNT = 10,// Count LIBUSB result codes other than completed === 0
            inlengthMax = this.options.length.in || this.inEndpoint.maximumPacketSize;

        // console.trace();

        if (this.log && this.log.logging) this.log.log('log', 'RX packet max length  ' + inlengthMax + ' bytes');

        var RXinfo = {
            "direction": this.inEndpoint.direction,
            "endpoint": this.inEndpoint.address | 128, // Raw endpoint address, as reported in bEndpoint descriptor
            "length": inlengthMax // Can be increased limited by LIBUSB buffering mechanism
        };

        var onRX = function _onRX(RXinfo) {

            var data,
                error;
            //console.timeEnd('RX');
            if (RXinfo.resultCode === USBChrome.prototype.LIBUSB_TRANSFER_COMPLETED) {

                transferErrorCount = 0;

                data = new Uint8Array(RXinfo.data);

                if (this.log && this.log.logging) this.log.log('log', "Rx", RXinfo, data);

                if (this.log && this.log.logging && data && data.length === 0)
                    this.log.log('warn', 'No data received data length is 0 bytes');

                if (this.log && this.log.logging && !data)
                    this.log.log('warn', 'Undefined data received', Rxinfo.data);
                try {
                    if (this.log && this.log.logging) console.time('RXparse');

                    
                    if (data)
                        this.emit('usb', data); // Using events allows more listeners of usb data, e.g logging/debugging
                    if (this.log && this.log.logging) console.timeEnd('RXparse');

                } catch (e) {
                    if (this.log && this.log.logging)
                        this.log.log('error', 'Got onRX error', e, e.stack);
                    else
                        console.error('Got onRX error', e, e.stack); // Force logging of serious error
                    this.emit('error', e);
                }


            }
            else {
                transferErrorCount++;
                if (this.log && this.log.logging) this.log.log('error', "Rx failed, resultCode ", RXinfo.resultCode, chrome.runtime.lastError.message);
               
                this.emit('error', new Error(chrome.runtime.lastError.message));
            }

            // Transfer may be cancelled by e.g releaseInterface -> don't attempt retries

            if (RXinfo.resultCode !== USBChrome.prototype.LIBUSB_TRANSFER_CANCELLED) {
                if (transferErrorCount < MAX_TRANSFER_ERROR_COUNT)
                    retry();
                else
                   
                {
                    error = new Error('Too many attempts with error from LIBUSB. Listening on in endpoint stopped.');
                    if (this.log && this.log.logging) this.log.log('error', error);
                    this.emit('error', error);
                }
            }


        }.bind(this);

        var retry = function _retryBulkTransfer() {
            //console.time('RX');
            // this.log.log('log',"retry", this.connectionHandle, RXinfo, onRX);

            chrome.usb.bulkTransfer(this.connectionHandle, RXinfo, onRX);


        }.bind(this);

        if (this.log && this.log.logging) this.log.log('log', "Listening on RX endpoint, address " + RXinfo.endpoint + ", max endpoint packet length is " + this.getINendpointPacketSize());

        retry();


    };

    USBChrome.prototype.exit = function (callback) {

        if (this.connectionHandle === undefined || this.deviceInterface === undefined) {
            callback(new Error('Wrong USB connection handle and/or device interface connectionHandle = ' + this.connectionHandle + ' deviceInterface = ' + this.deviceInterface));
        }

        chrome.usb.releaseInterface(this.connectionHandle, this.deviceInterface.interfaceNumber, function _ChromeUSBRelaseInterface() {

            chrome.usb.closeDevice(this.connectionHandle, function _ChromeUSBCloseDevice() {

                callback();

            });
        }.bind(this));
       
    };

    USBChrome.prototype.init = function (callback) {

        this.initCallback = callback; // Share between functions on prototype instead of passing as actual argument

        this._enumerateDevicesInManifest(this._onEnumerationComplete.bind(this));

    };

    USBChrome.prototype._onInterfaceClaimed = function ()
    {
        // Problems with claiming interface in Ubuntu 13.10 - was caused by suunto module which can be blacklisted to avoid problems in /etc/modules.d/blacklist.conf
        // Trying workaround proposed by : https://code.google.com/p/chromium/issues/detail?id=222460
        if (chrome.runtime.lastError) {
            if (this.log && this.log.logging) this.log.log('error', 'Could not claim interface - be aware that a linux kernel driver must not be active on the usb port, e.g suunto', chrome.runtime.lastError);
            this.initCallback(chrome.runtime.lastError);
        } else {
            if (this.log && this.log.logging) this.log.log('log', 'Interface number ' + this.deviceInterface.interfaceNumber + ' claimed', 'in', this.inEndpoint, 'out', this.outEndpoint);
            try {
                this.initCallback();
            } catch (e) {
                console.error(e, e.stack);
            }
        }
    }

    USBChrome.prototype._onInterfacesFound = function (interfaces)
    {
        if (interfaces && interfaces.length > 0) {
            if (this.log && this.log.logging) this.log.log('log', "Interfaces", interfaces);
            this.deviceInterface = interfaces[0];

            if (interfaces[0].endpoints && interfaces[0].endpoints.length > 1) {

                this.inEndpoint = this.deviceInterface.endpoints[0];
                this.outEndpoint = this.deviceInterface.endpoints[1];

                chrome.usb.claimInterface(this.connectionHandle, this.deviceInterface.interfaceNumber, this._onInterfaceClaimed.bind(this));

            } else
                if (this.log && this.log.logging) this.log.log('error', 'Failed to get in/out endpoint on interface');
        }
        else
            this.initCallback(new Error("Did not find interface of device"));
    }

    USBChrome.prototype._onDevicesFound = function (devices)
    {
        var chosenDevice = 0;
        if (this.options && typeof this.options.device === 'undefined') {
            if (this.log && this.log.logging) this.log.log('warn', 'No number for device specified, will choose the first (device 0)');
        }
        else
            chosenDevice = this.options.device;


        if (this.log.logging && devices) this.log.log('log', "USB devices found", devices);
        if (this.log.logging && !devices) this.log.log('error', 'No USB devices found satisfying open criteria');

        //var devices = devices;
        if (devices) {
            if (devices.length > 0) {

                this.connectionHandle = devices[chosenDevice];
                if (this.log && this.log.logging) this.log.log('log', "Device(s) found: " + devices.length, ' choosing device ' + chosenDevice, 'Connectionhandle', this.connectionHandle);
                // chrome.usb.listInterfaces(ConnectionHandle handle, function callback)
                chrome.usb.listInterfaces(this.connectionHandle, this._onInterfacesFound.bind(this));
            } else
                this.initCallback(new Error("No USB devices was found"));
        } else
            this.initCallback(new Error("Maybe permissions for accessing the device is not fullfilled"));

    }

    USBChrome.prototype._tryFindManifestDevice = function (index)
    {
        var defaultDevice;

        if (this.enumeratedManifestDevices && this.enumeratedManifestDevices[index]) {

            defaultDevice = this.enumeratedManifestDevices[index];
            this.defaultDevice = index; // Index within enumeratedManifestDevices array

            //if (this.options.deviceWatcher && this.options.deviceWatcher.onEnumerationCompleted && typeof this.options.deviceWatcher.onEnumerationCompleted === 'function')
            //    this.options.deviceWatcher.onEnumerationCompleted(); // TO DO : emit "enumerationcomplete"....

            if (this.log && this.log.logging) this.log.log('log', 'Trying to open ANT device ', defaultDevice);

            chrome.usb.findDevices({ "vendorId": defaultDevice.device.vendorId, "productId": defaultDevice.device.productId }, this._onDevicesFound.bind(this));
        }
    }

    USBChrome.prototype._onEnumerationComplete = function (error)
    {
        var defaultDevice,
            devNr;

        if (error) {
            this.initCallback(error);
            return;
        }
      
            // TEST multiple devices
            // this.enumeratedManifestDevices.push({ name : 'testname', id: 'testid', vendorId : 1111, productId: 2222});

        this.emit('enumerationcomplete');

        if (!this.options.deviceId) {

            // Special case : No device is previously set by user, by convention choose the first enumerated device
            // Most ordinary users only have 1 ANT device 

                if (this.log && this.log.logging) this.log.log('warn', 'No user specified default device id specificed in USB options');

                this._tryFindManifestDevice(0);
                
            } else {

                // Find deviceId among the enumerated devices
                if (this.log && this.log.logging) this.log.log('log', 'Looking for device id from options', this.options.deviceId, this.enumeratedManifestDevices.length);

                for (devNr = 0; devNr < this.enumeratedManifestDevices.length; devNr++) {
                    if (this.enumeratedManifestDevices[devNr].id === this.options.deviceId) {
                        defaultDevice = this.enumeratedManifestDevices[devNr];
                        this.defaultDevice = devNr;
                        break;
                    }
                }

                if (this.enumeratedManifestDevices.length > 0 && typeof this.defaultDevice === 'undefined') {
                    if (this.log && this.log.logging) this.log.log('warn', 'Did not find default device with id ' + this.options.deviceId + ', choosing the first enumerated device');
                    this.defaultDevice = 0;
                    defaultDevice = this.enumeratedManifestDevices[0];

                }

                if (defaultDevice) {
                    if (this.log && this.log.logging) this.log.log('log', 'Trying to open ANT device ', defaultDevice);
                    chrome.usb.findDevices({ "vendorId": defaultDevice.vendorId, "productId": defaultDevice.productId }, this._onDeviceFound.bind(this));
                }


                //// Give chance for UI update now
                //if (this.options.deviceWatcher && this.options.deviceWatcher.onEnumerationCompleted && typeof this.options.deviceWatcher.onEnumerationCompleted === 'function') this.options.deviceWatcher.onEnumerationCompleted();

            }
            //chrome.usb.findDevices({ "vendorId": this.options.vid, "productId": this.options.pid}, onDeviceFound);
        
    }

    // Enumerate the devices specified in manifest.json included in application package
    USBChrome.prototype._enumerateDevicesInManifest = function (callback) {
        var devNoManifest = 0,
            lenDevInManifest,
            devicesInManifest,
            manifestDevice,
            
             _gotDevices = function (devices) {
                 var devNr;

                 if (this.log && this.log.logging) this.log.log('log', 'Found devices for ' + currentDevice.name, devices);

                 // Add to manifest device collection

                 for (devNr = 0; devNr < devices.length; devNr++) {
                     //// Add name and id  to default data structure by USB chrome
                     //devices[devNr].name = currentDevice.name;
                     //devices[devNr].deviceNr = devNr;
                     //devices[devNr].id = 
                    
                     manifestDevice = {
                         'name': currentDevice.name,
                         'deviceNr': devNr,
                         'id': 'device' + devices[devNr].device + '#vid' + devices[devNr].vendorId + '#pid' + devices[devNr].productId + '#devNr' + devNr,
                         'device': devices[devNr]   // Default chrome data structure 0: Object {
                         //  device: 5
                         // productId: 4104
                         // vendorId: 4047 }
                     };

                     this.enumeratedManifestDevices.push(manifestDevice);
                 }


                 devNoManifest++;

                 if (devNoManifest < lenDevInManifest) {
                     // if (this.log && this.log.logging) this.log.log('log','devno length',devNoManifest,lenDevInManifest);
                     getDevices(); // Find more devices for given vendor id, product id
                 }
                 else {
                     if (this.log && this.log.logging) this.log.log('info', 'Devices that satisfy manifest permissions', this.enumeratedManifestDevices);
                    
                     if (typeof callback === 'function')
                        callback(undefined);
                 }
             }.bind(this),

            currentDevice,


         getDevices = function () {

             currentDevice = devicesInManifest[devNoManifest];

             if (this.log && this.log.logging) this.log.log('log', 'Get devices for  ', currentDevice, devNoManifest, lenDevInManifest);

             chrome.usb.getDevices({ vendorId : currentDevice.vendorId, productId : currentDevice.productId }, _gotDevices);

         }.bind(this);

        devicesInManifest = this.getDevicesFromManifest();

        if (this.log && this.log.logging) this.log.log('log', 'ANT devices declared in manifest', devicesInManifest);

        lenDevInManifest = devicesInManifest.length;

        this.enumeratedManifestDevices = [];

        if (lenDevInManifest > 0)
            getDevices();
        else {
            // if (this.log && this.log.logging) this.log.log('error','No ANT devices configured in manifest, cannot enumerate devices');

            if (typeof this.initCallback === 'function')
                this.initCallback(new Error('No ANT devices configured in manifest, cannot enumerate devices'));
        }

    };

    USBChrome.prototype.getDevicesFromManifest = function () {
        var permissions = chrome.runtime.getManifest().permissions;
        for (var permissionNr = 0; permissionNr < permissions.length; permissionNr++) {
            if (typeof permissions[permissionNr] === 'object' && permissions[permissionNr].usbDevices) {
                return permissions[permissionNr].usbDevices;

            }
        }
    };

    return USBChrome;

});
