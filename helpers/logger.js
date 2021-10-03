const client = require('prom-client');
// const debug = require("debug")("water-logger")

const debug = (...params) => console.log(...params);

let automaticControl = 1;

const level = new client.Gauge({ name: 'waterlevel', help: 'water level at current time' });
const measureGauge = new client.Gauge({ name: 'measurement', help: 'raw measurement at current time' });
// const motorState = new client.Gauge({ name: 'motorstate', help: 'current state of motor' });
// const currentCommand = new client.Gauge({ name: 'currentCommand', help: 'current command to the motor' });

let previousTimestamp;
const handleRead = (data) => {
  const { calculatedDistance: measurement, timestamp, percentage } = data;

  if (previousTimestamp != timestamp) {
    previousTimestamp = timestamp;
    debug("Last water level: " + percentage + " at: " + (new Date(timestamp)));
    level.set(percentage);
    debug("Last measurement: " + measurement + " at: " + (new Date(timestamp)));
    measureGauge.set(measurement);
  }
  // motorState.set(data.motorController.state.current == "on" ? 1 : 0)
  // currentCommand.set(data.motorController.command.current == "on" ? 1 : (data.motorController.command.current == "off" ? -1 : 0))
  // automaticControl = data.settings.automaticControl;
}

const bootstrap = (db) => {
  db.child("waterLevelSensor/output").on("value", (snapshot) => {
    handleRead(snapshot.val());
  });
}

exports.bootstrap = bootstrap;
exports.getAutomaticControl = () => automaticControl;

