﻿"use strict"
var USBDevice = require('./USBDevice.js'),
    usb = require('usb'),
    ANT = require('ant-lib'),
    Duplex = require('stream').Duplex;

function initStream() {

    var endpointPacketSize = this.getOUTEndpointPacketSize();

    this._stream = new Duplex({ highWaterMark: endpointPacketSize });

    // Rx: 
    this._stream._read = function () {
        //console.trace();
        //console.log("USBDevice _read", arguments);
    }.bind(this);

    // TX: Everything that should be written to the ANT chip goes via this stream
    this._stream._write = function (payload, encoding, nextCB) {

        var burstLen = this._burstBuffer.length + payload.length;

        //console.log("USBDevice _write", payload, "burst mode", this.burstMode, "burst buffer", this._burstBuffer);
        //console.trace();
        // Loopback test : this._stream.push(new Buffer([1, 2, 3, 4]));
        // node.js - wants to minimize internal buffer on streams (lower RAM usage)
        // but now I want to maximize the amount of bytes written to the ANT chip  
        // to saturate receive buffers in ANT CHIP for bursts, so it seems like I have to have a separate buffer here
        if (this.burstMode && burstLen < endpointPacketSize) { // Available space in buffer

            this._burstBuffer = Buffer.concat([this._burstBuffer, payload]);
            console.log("Buffering ", payload, " burst buffer is now:", this._burstBuffer);
        }
        else if (this.burstMode) { // Buffer is full
            console.log("Write burst to ANT chip now",this._burstBuffer);
            this.write(this._burstBuffer, function () { this._burstBuffer = payload; nextCB() }.bind(this));
        } else // {

            if (this._burstBuffer.length > 0) // Still a burst in burst buffer
            {
                console.log("Still a burst packet in buffer", this._burstBuffer);
                this.write(Buffer.concat([this._burstBuffer, payload]), function () { this._burstBuffer = new Buffer(0); nextCB() }.bind(this));
            }
            else
                this.write(payload, nextCB);
       

        //nextCB();
    }.bind(this);

}
function USBNode() {
    USBDevice.call(this);

    this.addListener(USBNode.prototype.EVENT.LOG, this.showLogMessage);
    this.addListener(USBNode.prototype.EVENT.ERROR, this.showLogMessage);

  

    this.setBurstMode(false);


}

USBNode.prototype = Object.create(USBDevice.prototype);

USBNode.prototype.constructor = USBNode; // Otherwise constructor = USBDevice ...

USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE = 64;  // Based on info in nRF24AP2 data sheet

USBNode.prototype.ANT_DEVICE_TIMEOUT = 13; // 11.11 ms to transfer 64 bytes at 57600 bit/sec  -> 64 * 10 (1+8+1) bit = 640bit -> (640 / 57600 ) *1000 ms = 11.11 ms 

USBNode.prototype.getStream = function () {
    return this._stream;
}

USBNode.prototype.getINEndpointPacketSize = function () {
    return this.inEP.descriptor.wMaxPacketSize || USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE;
},

USBNode.prototype.getOUTEndpointPacketSize = function () {
    return this.outEP.descriptor.wMaxPacketSize || USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE;
},

// ANT CHIP serial interface configured at 57600 baud (BR pins 1 2 3 = 111) = 57600 bit/s = 57.6 bit/ms
// Sends : 1 start bit + 8 data bits + 1 stop bits = 10 bit/byte
// 57.6 bit/ms / 10 bit/byte = 5.76 byte/ms
// So, f.ex SYNC + MSG L. + MSG ID + 8 bytes payload + CRC = 12 bytes -> 12 bytes / 5.76 bytes/ms = 2.083 ms transfer time
// 32 bytes transfer : 32 / 5.76 = 5.55 ms, 64 bytes : 2*5.55 = 11.11 ms
// So a sensible timeout value could be >= 11.11 ms. It's possible to set a dynamic timeout based on how much bytes to transfer, but that needs some computations that takes time
// dynamictimeout = parseInt(Math.Ceil(chunk/5.76),10)
USBNode.prototype.setDirectANTChipCommunicationTimeout = function (timeout)
{
    this.setDeviceTimeout(timeout || USBNode.prototype.ANT_DEVICE_TIMEOUT);
}

USBNode.prototype.setDeviceTimeout = function (timeout) {
    this.device.timeout = timeout;
}

USBNode.prototype.isTimeoutError = function (error) {
    return (error.errno === usb.LIBUSB_TRANSFER_TIMED_OUT);
}

USBNode.prototype.init = function (idVendor, idProduct, nextCB) {
    var
        antInterface,
        err;
    //console.log("INIT args", arguments);

    //  usb.setDebugLevel(3);
    if (typeof idVendor === "undefined")
        throw new Error("Vendor id not specified");

    if (typeof idProduct === "undefined")
        throw new Error("Product id not specified");

    this.idVendor = idVendor;
    this.idProduct = idProduct;

    //var idVendor = 4047, idProduct = 4104; // Garmin USB2 Wireless ANT+

    this.device = usb.findByIds(idVendor, idProduct);
   // TEST this.device = undefined;

    if (typeof this.device === "undefined") {
        err = new Error("Could not find USB ANT device vendor id:" + this.idVendor + " product id.:" + this.idProduct);
        this.emit(USBDevice.prototype.EVENT.ERROR, err);
        nextCB(err);
        //throw err; 
        //return;
        //errorCallback();
    } 

        this.emit(USBDevice.prototype.EVENT.LOG, "USB ANT device found vendor 0x" + this.idVendor.toString(16) + "/" + this.idVendor + " product 0x" + this.idProduct.toString(16) + "/" + this.idProduct + " on bus " + this.device.busNumber + " address " + this.device.deviceAddress);

        //+ ", max packet size endpoint 0/control: " + this.device.deviceDescriptor.bMaxPacketSize0 + " bytes, default transfer timeout ms.: " + this.device.timeout + ", packet size endpoints in/out 64 bytes");

        //console.log("Opening interface on device GARMIN USB2 ANT+ wireless/nRF24AP2 (Dynastream Innovations Inc.)");
        //console.log("Vendor id: " + this.idVendor + " Product id: " + this.idProduct);

        this.device.open(); // Init/get interfaces of device
        //console.log("Default timeout for native libusb transfer is :" + ant.timeout);

        antInterface = this.device.interface();
    // TEST  antInterface = undefined;
        if (typeof antInterface === "undefined") {
            err = new Error("Could not get interface to ANT device, aborting");
            this.emit(USBDevice.prototype.EVENT.ERROR, err);
            nextCB(err);
            //throw err;
            //return;
            //errorCallback();
        }
        //else {
        //   console.log("Found default interface, it has " + this.antInterface.endpoints.length + " endpoints ");
        //}

        if (antInterface.endpoints.length < 2) {
            err = new Error("Normal operation require 2 endpoints for in/out communication with ANT device");
            this.emit(USBDevice.prototype.EVENT.ERROR, err);
            nextCB(err); // Let higher level API get a chance to deal with the error
            //throw err;
            //return;
            //errorCallback();
        }

        // http://www.beyondlogic.org/usbnutshell/usb5.shtml
        this.inEP = antInterface.endpoints[0]; // Control endpoint
       
        //if (this.inEP.transferType === usb.LIBUSB_TRANSFER_TYPE_BULK)
        //    inTransferType = "BULK (" + this.inEP.transferType + ')';

        this.outEP = antInterface.endpoints[1];
        //if (this.outEP.transferType === usb.LIBUSB_TRANSFER_TYPE_BULK)
        //    outTransferType = "BULK (" + this.outEP.transferType + ')';

        // Shared endpoint number in/control and out
        // console.log("Number for endpoint: " + (this.inEP.address & 0xF) + " Control/in " + inTransferType + " - " + (this.outEP.address & 0xF) + " " + this.outEP.direction + " " + outTransferType);

        // console.log("Claiming interface");
        antInterface.claim(); // Must call before attempting transfer on endpoints

        this.emit(USBDevice.prototype.EVENT.LOG, "RX Endpoint IN (ANT -> HOST) wMaxPacketSize: " + this.inEP.descriptor.wMaxPacketSize + " bytes");
        this.emit(USBDevice.prototype.EVENT.LOG, "TX Endpoint OUT(HOST -> ANT) wMaxPacketSize: " + this.outEP.descriptor.wMaxPacketSize + " bytes");


        //this.listen();

        //  console.log("Cleaning LIBUSB in endpoint buffers....");

    //console.log("THIS IS NOW", this);

    //console.log(drainLIBUSB);

        initStream.bind(this)();

        drainLIBUSB.bind(this)(function _drainLIBUSBCB(error, totalBytesDrained) {

            if (totalBytesDrained > 0)
                this.emit(USBDevice.prototype.EVENT.LOG, 'Drained ' + totalBytesDrained + ' from in endpoint');

            if (typeof nextCB === "function") {
                nextCB(error);
            }

        }.bind(this));

}



USBNode.prototype.exit = function (nextCB) {
    //console.log(Date.now(), "Exiting USBNODE now.");

   // console.trace();

    function releaseInterfaceCloseDevice()  {

        this.device.interface().release(function (error) {
            if (error)
                this.emit(USBDevice.prototype.EVENT.ERROR, error);
            else {
                //console.log("Closing device, removing interface, exiting...");
                this.device.close();
                if (typeof nextCB === "function")
                    nextCB();
            }
        });
    };

    if (this.inTransfer) {
        //console.log("Canceling transfer on in endpoint");
        this.inTransfer.cancel(); 
    }

    if (this.outTransfer) {
        // console.log("Canceling transfer on out endpoint");
        this.outTransfer.cancel();
    }

    drainLIBUSB.bind(this)(releaseInterfaceCloseDevice.bind(this));

}

// Private func. -> not accessible on USBNode.prototype
function drainLIBUSB(nextCB) {

    var totalBytesDrained = 0,
        drainAttempt = 0,
        MaxDrainAttemps = 5;

    this.setDirectANTChipCommunicationTimeout();

    // In case we already are listening on in endpoint, cancel it please
    if (this.inTransfer)
        this.inTransfer.cancel();

    function retry() {

        drainAttempt++;
        //console.log("Drain attempt", drainAttempt);

        this.inTransfer = this.inEP.transfer(USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE, function (error, data) {

            if (data.length > 0)
                totalBytesDrained += data.length;

            if (drainAttempt < MaxDrainAttemps) {

                process.nextTick(retry.bind(this)); // Should be the highest priority
            }
            else {
                //console.log("DRAINING FINISHED", totalBytesDrained);
                nextCB(error, totalBytesDrained);
            }
        }.bind(this));
    }

    retry.bind(this)();

};


// "There is no flow control for data transmitted from ANT to host, therefore the Host controller must be able to receive data at any time" p. 8 of
// Interfacing with ANT general purpose chipsets and modules rev 2.1 -> setup a read that never times out on in endpoint
USBNode.prototype.listen = function (nextCB) {
    var INFINITY = 0;
    //console.log("USB LISTEN");
    //console.trace();

    

    function retry () {

        try {
            this.setDeviceTimeout(INFINITY);
         
            //console.time('RXtime');
            this.inTransfer = this.inEP.transfer(USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE, function (error, data) {
                //console.timeEnd('RXtime')
                console.log('RX', data);
               // console.log("IN USB error,data", error, data);
                if (!error) {

                    if (data && data.length > 0)
                        this._stream.push(data); // RX -> (piped into DeFrameTransform writable stream)
                    process.nextTick(retry.bind(this));
                } else
                    nextCB(error);
            }.bind(this));
        } catch (error) {
            //if (error.errno === -1) // LIBUSB_ERROR_IO 
            //    {
            this.emit(USBDevice.prototype.EVENT.LOG, 'I/O error - Attempt to read from USB ANT generated an serious input error');
            this.emit(USBDevice.prototype.EVENT.ERROR, error);
            nextCB(error);
        }
    }

   retry.bind(this)();
}

USBNode.prototype.write = function (chunk, nextCB)
{
    //nextCB(); // Remove
    //return;

    //console.trace();

    var sendAttempt = 1,
        MAXATTEMPT = 5,
        err;

  

   
    function retry() {
        //console.trace();
        try {
            this.setDirectANTChipCommunicationTimeout();
            console.log('TX', chunk);
            console.time('TXtime');
            this.outTransfer = this.outEP.transfer(chunk, function _outTransferCallback(error) {
                console.timeEnd('TXtime')
                 // Test LIBUSB transfer error
                //error = {};
                //if (sendAttempt === 3)
                //    error.errno = usb.LIBUSB_TRANSFER_CANCELLED;
                //else
                //    error.errno = usb.LIBUSB_TRANSFER_ERROR;

                if (error) { // LIBUSB errors
               
                    this.emit(USBDevice.prototype.EVENT.ERROR, error);

                    if (error.errno !== usb.LIBUSB_TRANSFER_CANCELLED) {
                        if (sendAttempt <= MAXATTEMPT) {
                            setTimeout(function _retryTimeoutTX() {
                                this.emit(USBDevice.prototype.EVENT.LOG, new Error("TX: Retry sending " + sendAttempt));
                                sendAttempt++;

                                // http://stackoverflow.com/questions/15349733/setimmediate-vs-nexttick
                                //setImmediate(retry);  
                                process.nextTick(retry.bind(this));
                                //retry();
                            }, this.device.timeout);
                        } else {
                            err = new Error('TX: Max. retry attempts reached');
                            this.emit(USBDevice.prototype.EVENT.ERROR,err );

                            nextCB(err); // Allow proceed...
                        }
                    } else 
                        nextCB(error); // Transfer cancelled
                }
                else 
                    nextCB();
            }.bind(this));
        } catch (error) {
            this.emit(USBDevice.prototype.EVENT.LOG, "I/O error - Attempt to write to USB ANT chip generated an serious output error ");
            this.emit(USBDevice.prototype.EVENT.ERROR, error);
            nextCB(error);
        }
    }

    retry.bind(this)();
}

module.exports = USBNode;