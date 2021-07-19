const config = require("../config/config");
const api = require("./api");
const debug = require("debug")("water-motorHelper");
let db;

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

const setMotorState = (command) => {
  debug(`Turning motor ${command}`);
  if (command == state.on) {
    // TODO: If in between certain times ignore the request, if turned off in db, ignore the request
    // TODO: If turned on, set timer for 20 mins to turn off, in case other one doesn't work
  }
  db.child("motorController/command").set({
    current: command,
    timestamp: new Date().getTime()
  });
}

const controlMotor = (measurements, data) => {
  if (data.motorController.state.current == state.on && data.motorController.command.timestamp < (new Date().getTime() - data.settings.turnMotorOffMins * 60000)) {
    debug(`Motor on for more than ${data.settings.turnMotorOffMins} minutes, Turning it off`);
    setMotorState(state.off);
  } else if (data.motorController.state.current == state.on && measurements.some(x => x > data.settings.motorOffThreshold)) {
    debug(`Water level > ${data.settings.motorOffThreshold}, Turning it off`);
    setMotorState(state.off);
  } else if (data.motorController.state.current == state.off && measurements.every(x => x < data.settings.motorOnThreshold)) {
    debug(`Water level < ${data.settings.motorOnThreshold}, Turning in ON`);
    setMotorState(state.on);
  }
}

const getLastMeasurements = async () => {
   const end = new Date();
   const start = new Date(end.getTime() - 5 * 60000);
   return api.get(`/query_range?query=measurement&start=${start.toISOString()}&end=${end.toISOString()}&step=15s`).then(result=> {
     const { data } = result;
     if (data.status == 'success' && data.data && data.data.result) {
       // debug("result", data.data.result);
       // debug("values", data.data.result[0].values);
       measurements = data.data.result[0].values.map(x => parseInt(x[1]));
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
}

const bootstrap = (_db) => {
  db = _db;
  db.child("waterlevel/measurement").on("value", async () => {
    const snapshot = await db.once("value")
    const data = snapshot.val();
    const measurements = removeOutliers(await getLastMeasurements());
    setPercent(measurements, data);
    controlMotor(measurements, data);
  });
}

exports.bootstrap = bootstrap;
