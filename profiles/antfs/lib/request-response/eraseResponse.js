/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  function EraseResponse(data) {
    if (data)
      this.deserialize(data);
  }

  EraseResponse.prototype.OK = 0x00;
  EraseResponse.prototype.FAILED = 0x01;
  EraseResponse.prototype.NOT_READY = 0x03;

  EraseResponse.prototype.ID = 0x8B;

  EraseResponse.prototype.deserialize = function(data) {
    // overview p. 59 in spec of response format

    var dv = new DataView(data.buffer),
      iStart,
      iEnd;

    // HEADER

    // data[0] should be 0x44 ANT-FS RESPONSE/COMMAND
    // data[1] should be 0x84;

    this.result = data[2];

  };

  EraseResponse.prototype.toString = function() {

    var msg = 'ERASE ';

    switch (this.result) {

      case EraseResponse.prototype.OK:

        msg += 'OK';
        break;

      case EraseResponse.prototype.FAILED:

        msg += 'Failed';
        break;

      case EraseResponse.prototype.NOT_READY:

        msg += 'Not ready to erase';
        break;

    }

    return msg;
  };

  module.exports = EraseResponse;
  
