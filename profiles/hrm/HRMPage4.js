/* global define: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var HRMPage = require('./HRMPage');

  function HRMPage4(configuration, broadcast, profile, pageNumber) {

    HRMPage.call(this, configuration, broadcast, profile, pageNumber);

  }

  HRMPage4.prototype = Object.create(HRMPage.prototype);
  HRMPage4.prototype.constructor = HRMPage4;

  HRMPage4.prototype.readCommonBytes = function() {
    var data = this.broadcast.data,
      dataView = new DataView(this.broadcast.data.buffer);

    this.readHR();

    // Page 4 has previousHeartBeatEventTime at byte 2-3
    // -> don't need to have the previous page available to compute RR
    // Spec. section 5.3.6 p. 19 "this format provides a level of redundancy in the transmitted datastream"

    this.previousHeartBeatEventTime = dataView.getUint16(data.byteOffset + 2, true);

  };


  module.exports = HRMPage4;
  return module.exports;

});