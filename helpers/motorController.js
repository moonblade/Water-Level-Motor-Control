const config = require("../config/config");
const api = require("./api");
const debug = require("debug")("water-motorHelper");
let db;

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

const removeOutliers = arr => {
  const avg = average(arr);
  const dev = stdDeviation(arr);
  arr = arr.filter(x => Math.abs(x - avg) <= dev)
  return arr;
}

const getPercentage = (measurement, minimumValue, maximumValue) => {
  let percentage = (100 - (((measurement - minimumValue) * 100) / Math.max((maximumValue - minimumValue), 1)));
  percentage = Math.round(Math.max(Math.min(100, percentage), 0));

  return percentage
}

const state = {
  on: "on",
  off: "off"
}

const setAutoControl = (value) => {
  debug("Setting automatic control to value " + value);
  db.child("settings/automaticControl").set(value);
}

const setMotorState = (command, data) => {
  debug(`Turning motor ${command}`);
  if (command == state.on && data) {
    if (data.settings.automaticControl != 1) {
      return;
    }
    if (isBetweenTimes(data.settings.offtimeFrom, data.settings.offtimeTo)) {
      return;
    }
  }
  db.child("motorController/command").set({
    current: command,
    timestamp: new Date().getTime()
  });
}

const controlMotor = (percent, data) => {
  if (data.motorController.state.current == state.on && data.motorController.command.timestamp < (new Date().getTime() - data.settings.turnMotorOffMins * 60000)) {
    debug(`Motor on for more than ${data.settings.turnMotorOffMins} minutes, Turning it off`);
    setMotorState(state.off, data);
  } else if (data.motorController.state.current == state.on && percent > data.settings.motorOffThreshold) {
    debug(`Water level > ${data.settings.motorOffThreshold}, Turning it off`);
    setMotorState(state.off, data);
  } else if (data.motorController.state.current == state.off && percent < data.settings.motorOnThreshold && data.motorController.command.timestamp < (new Date().getTime() - data.settings.waitBetweenCommands * 60000)) {
    debug(`Water level < ${data.settings.motorOnThreshold}, Turning in ON`);
    setMotorState(state.on, data);
  }
}

const getLastMeasurements = async (oldData) => {
   const end = new Date();
   const start = new Date(end.getTime() - 4 * 60000);
   return api.get(`/query_range?query=measurement&start=${start.toISOString()}&end=${end.toISOString()}&step=15s`).then(result=> {
     const { data } = result;
     if (data.status == 'success' && data.data && data.data.result) {
       // debug("result", data.data.result);
       // debug("values", data.data.result[0].values);
       measurements = data.data.result[0] && data.data.result[0].values.map(x => parseInt(x[1])) || [oldData.waterlevel.measurement];
       return measurements;
     } else {
       debug("failure", data);
       return [];
     }
   }).catch(error => {
     debug("error", error)
   });
}

const setPercent = (measurements, data) => {
  const measurement = average(measurements);
  const { minimumValue, maximumValue } = data.settings;
  const percentage = getPercentage(measurement, minimumValue, maximumValue);
  db.child("waterlevel/percentage").set(percentage);
  return percentage;
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
  db.child("waterlevel/measurement").on("value", async () => {
    const snapshot = await db.once("value")
    const data = snapshot.val();
    const measurements = removeOutliers(await getLastMeasurements(data));
    percent = setPercent(measurements, data);
    controlMotor(percent, data);
  });
}

exports.bootstrap = bootstrap;
exports.setMotorState = setMotorState;
exports.setAutoControl = setAutoControl;
exports.setDbValue = setDbValue;
exports.getDbValue = getDbValue;
