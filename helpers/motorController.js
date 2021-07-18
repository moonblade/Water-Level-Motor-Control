const config = require("../config/config");
const api = require("./api");
const debug = require("debug")("water-motorHelper");

const state = {
  on: "on",
  off: "off"
}

const setMotorState = (db, command) => {
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

const controlMotor = (db, measurements, data) => {
  if (data.motorController.state.current == state.on && data.motorController.command.timestamp < (new Date().getTime() - data.settings.turnMotorOffMins * 60000)) {
    debug(`Motor on for more than ${data.settings.turnMotorOffMins} minutes, Turning it off`);
    setMotorState(db, state.off);
  } else if (data.motorController.state.current == state.on && measurements.some(x => x > data.settings.motorOffThreshold)) {
    debug(`Water level > ${data.settings.motorOffThreshold}, Turning it off`);
    setMotorState(db, state.off);
  } else if (data.motorController.state.current == state.off && measurements.every(x => x < data.settings.motorOnThreshold)) {
    debug(`Water level < ${data.settings.motorOnThreshold}, Turning in ON`);
    setMotorState(db, state.on);
  }
}

const getLastMeasurements = async () => {
   const end = new Date();
   const start = new Date(end.getTime() - 5 * 60000);
   return api.get(`/query_range?query=waterlevel&start=${start.toISOString()}&end=${end.toISOString()}&step=1m`).then(result=> {
     const { data } = result;
     if (data.status == 'success' && data?.data?.result) {
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

const bootstrap = (db) => {
  db.on("value", async (snapshot) => {
    const data = snapshot.val();
    const measurements = await getLastMeasurements();
    controlMotor(db, measurements, data);
  });
}

exports.bootstrap = bootstrap;
