var slaveHost = new(require('../host'))({
  log: true
});
var slavePort = 1;
var slaveChannel0 = slaveHost.channel[0];
var key;
var devices;
var burstNr = 0;

function onExited(error) {
  console.log('exited', error);
}

function onPage(page) {
  console.log(page);
}


function onReset(error, notification) {
  console.log('onReset', error);
}

function onSlaveChannel0Open(err, msg) {
  console.log('slave open');
}

function onAckBroadcast(err, msg) {
  console.log(Date.now(), 'ACK broadcast', err);
  //  if (!slaveChannel0.hasId())
  //    slaveChannel0.getId(function (err,channelId) { console.log('cid'+channelId);});
}

function onBroadcast(err, msg) {
  console.log(Date.now(), 'broadcast', err);
  //  if (!slaveChannel0.hasId())
  //    slaveChannel0.getId(function (err,channelId) { console.log('cid'+channelId);});
}

function onBurst() {
  console.log(Date.now(), 'Received burst ', slaveChannel0.burst.byteLength);
}

function onBurstData(err, msg) {
  if (msg.sequenceNr === 0)
    burstNr = 1;
  else
    burstNr++;
  console.log(Date.now(), 'burst', err, 'channel ' + msg.channel + ' seq ' + msg.sequenceNr + ' nr ' + burstNr);
}

function onSlaveAssigned(error) {
  console.log('slave assigned', error);

  // slaveChannel0.setFrequency(slaveChannel0.NET.FREQ['ANT+'],function () {

  //     slaveChannel0.setPeriod(slaveChannel0.NET.PERIOD.ENVIRONMENT.LOW_POWER,function () {

  slaveChannel0.setId(1, 1, 1, function(err, msg) {
    console.log('setChannelId response', msg.toString());
    slaveChannel0.on('data', onBroadcast);
    slaveChannel0.on('ackdata', onAckBroadcast);
    slaveChannel0.on('burstdata', onBurstData); // Each packet
    slaveChannel0.on('burst', onBurst);
    console.log('slave channel' + slaveChannel0);
    slaveChannel0.open(onSlaveChannel0Open);
  });
  //     });
  // });
}


function onSlaveKey(error) {

  // slaveHost.enableAdvancedBurst(function (err,msg)  {
    //if (!err)
       slaveChannel0.slave(0, onSlaveAssigned);
  //});
}

function onSlaveInited(error) {
  console.log('slave initied', error);

  //key = slaveChannel0.NET.KEY['ANT+'];
  if (key)
    slaveChannel0.key(0, key, onSlaveKey);
  else
    onSlaveKey();

}

function onError(error) {
  console.trace();
  console.error('error', error);
}

devices = slaveHost.getDevices();
//console.log('devices',slaveHost.getDevices());

try {

  console.log('slave device', devices[slavePort]);
  slaveHost.init(slavePort, onSlaveInited);
} catch (err) {
  onError(err);
}
