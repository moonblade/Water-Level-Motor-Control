const config = require("../config/config");
const api = require("./api");
const { CircularArray } = require('circular-array');
// const debug = require("debug")("water-motorHelper");
let db;

const debug = (...params) => console.log(...params);
const savedValues = new CircularArray(10);
let lastTurnOn = 0;

const isBetweenTimes = (startTime, endTime) => {
// var endTime = '22:30:00';

  currentDate = new Date()   
  
  startDate = new Date(currentDate.getTime());
  startDate.setHours(startTime.split(":")[0]);
  startDate.setMinutes(startTime.split(":")[1]);
  startDate.setSeconds(startTime.split(":")[2]);
  
  endDate = new Date(currentDate.getTime());
  endDate.setHours(endTime.split(":")[0]);
  endDate.setMinutes(endTime.split(":")[1]);
  endDate.setSeconds(endTime.split(":")[2]);
  
  return startDate < currentDate && endDate > currentDate
}

const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;
function stdDeviation(arr){
  mean = average(arr);
  arr = arr.map((k)=>{
    return (k - mean) ** 2
  })
 let sum = arr.reduce((acc, curr)=> acc + curr, 0);
 return Math.sqrt(sum / arr.length)
}

const removeOutliers = (data, arr) => {
  if (data.settings.removeOutliers == 0 || data.motorController.state.current == state.on) {
    return arr;
  }
  const avg = average(arr);
  const dev = stdDeviation(arr);
  arr = arr.filter(x => Math.abs(x - avg) <= dev * 2)
  return arr;
}

const getPercentage = (measurement, minimumValue, maximumValue) => {
  let percentage = (100 - (((measurement - minimumValue) * 100) / Math.max((maximumValue - minimumValue), 1)));
  percentage = Math.round(Math.max(Math.min(100, percentage), 0));

  return percentage
}

const state = {
  on: "on",
  off: "off",
  none: "none"
}

const setAutoControl = (value) => {
  debug("Setting automatic control to value " + value);
  db.child("settings/automaticControl").set(value);
}

const setMotorState = (command, data) => {
  debug(`Turning motor ${command}`);
  if (data && command != state.none) {
    if (data.settings.automaticControl != 1) {
      return;
    }
    if (command == state.on && isBetweenTimes(data.settings.offtimeFrom, data.settings.offtimeTo)) {
      return;
    }
  }
  db.child("motorController/command").set({
    current: command,
    timestamp: new Date().getTime()
  });
}

const controlMotor = (percentages, data) => {
  if (data.motorController.command.timestamp > new Date().getTime() - data.settings.waitSecondsBetweenAnyCommand * 1000) {
    debug("Not enough time since last command, exiting");
    return;
  }
  debug("percentages to take decision", percentages);
  if (data.motorController.state.current == state.on && lastTurnOn <= (new Date().getTime() - data.settings.turnMotorOffMins * 60000)) {
    debug(`Motor on for more than ${data.settings.turnMotorOffMins} minutes, Turning it off`);
    setMotorState(state.off, data);
  } else if (data.motorController.state.current == state.on && percentages.some(x => x >= data.settings.motorOffThreshold)) {
    debug(`Water level > ${data.settings.motorOffThreshold}, Turning it off`);
    setMotorState(state.off, data);
  } else if (data.motorController.state.current == state.off && percentages.every(x => x <= data.settings.motorOnThreshold) && lastTurnOn < (new Date().getTime() - data.settings.waitBetweenCommands * 60000)) {
    debug(`Water level < ${data.settings.motorOnThreshold}, Turning it ON`);
    setMotorState(state.on, data);
  } else if (data.motorController.command.current !== state.none) {
    setMotorState(state.none, data);
  }
}

const getLastMeasurements = async (oldData) => {
   savedValues.push(oldData.waterlevel.measurement);
   return savedValues.array();
}

const setPercent = (rawMeasurements, measurements, data) => {
  const measurement = average(measurements);
  const { minimumValue, maximumValue } = data.settings;
  const percentage = getPercentage(measurement, minimumValue, maximumValue);
  debug("measurement", measurement)
  debug("measurements", measurements)
  debug("rawMeasurements", rawMeasurements)
  debug("percentage", percentage)
  // debug("Setting percentage ", percentage);
  db.child("waterlevel/percentage").set(percentage);
  db.child("waterlevel/percentageUpdatedAt").set(new Date().getTime());
  return rawMeasurements.map((measurement) => getPercentage(measurement, minimumValue, maximumValue));
}

const setDbValue = (key, value) => {
  try {
    if (typeof value == "string" && value.indexOf(":") == -1) {
      intValue = parseInt(value)
      value = intValue
    }
  } catch (error) {
    debug("not int value");
  }
  db.child(key).set(value);
}

const getDbValue = async (key) => {
  debug("Getting db value for key " + key);
  const value = await db.child(key).once("value");
  return value.val();
}

const bootstrap = (_db) => {
  db = _db;
  db.child("waterlevel/timestamp").on("value", async () => {
    const snapshot = await db.once("value")
    const data = snapshot.val();
    const rawMeasurements = await getLastMeasurements(data);
    const measurements = removeOutliers(data, rawMeasurements);
    percentages = setPercent(rawMeasurements, measurements, data);
    controlMotor(percentages, data);
  });
  db.child("motorController/state/current").on("value", (snap) => {
    if (state.on == snap.val()) {
      lastTurnOn = new Date().getTime();
    }
  });
}

exports.bootstrap = bootstrap;
exports.setMotorState = setMotorState;
exports.setAutoControl = setAutoControl;
exports.setDbValue = setDbValue;
exports.getDbValue = getDbValue;
