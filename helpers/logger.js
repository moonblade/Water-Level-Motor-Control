const client = require("prom-client");
// const debug = require("debug")("water-logger")

const debug = (...params) => console.log(...params);

let automaticControl = 1;

const level = new client.Gauge({
  name: "waterlevel",
  help: "water level at current time",
});
const measureGauge = new client.Gauge({
  name: "measurement",
  help: "raw measurement at current time",
});
const motorState = new client.Gauge({
  name: "motorstate",
  help: "current state of motor",
});
// const currentCommand = new client.Gauge({ name: 'currentCommand', help: 'current command to the motor' });

let previousTimestamp;
const handleRead = (data) => {
  const { calculatedDistance: measurement, timestamp, percentage } = data;

  if (previousTimestamp != timestamp) {
    previousTimestamp = timestamp;
    debug("Last water level: " + percentage + " at: " + new Date(timestamp));
    level.set(percentage);
    debug("Last measurement: " + measurement + " at: " + new Date(timestamp));
    measureGauge.set(measurement);
  }
  // currentCommand.set(data.motorController.command.current == "on" ? 1 : (data.motorController.command.current == "off" ? -1 : 0))
  // automaticControl = data.settings.automaticControl;
};

const handleMotorState = (data) => {
  const { current } = data;
  motorState.set(current == "on" ? 1 : 0);
};

const bootstrap = (db) => {
  db.child("waterLevelSensor/output").on("value", (snapshot) => {
    handleRead(snapshot.val());
  });
  db.child("motorController/state").on("value", (snapshot) => {
    handleMotorState(snapshot.val());
  });

  //  setInterval(function() {
  //  db.child('waterLevelIndicator/logs').limitToFirst(30000).once('value', snap => {
  //    var updates = {};
  //    console.log("snaplength", snap.length)
  //    snap.forEach(snapInstance => {
  //      console.log(snapInstance.key)
  //      updates[snapInstance.key] = null;
  //    });
  //    db.child("waterLevelIndicator/logs").update(updates);
  //  });
  //    }, 5000);
  //
  //  db.child("waterLevelIndicator/logs").remove().then(function() {
  //      console.log('Ok');
  //    })
  //    .catch(function(error) {
  //      console.log('Error deleting data:', error);
  //    });
};

exports.bootstrap = bootstrap;
exports.getAutomaticControl = () => automaticControl;
