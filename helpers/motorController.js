const cron = require('node-cron');
const config = require("../config/config");
const api = require("./api");
const debug = require("debug")("water-motorHelper");

const state = {
  on: "on",
  off: "off"
}

const setMotorState = (db, current) => {
  if (current == state.on) {
    // TOOD: If in between certain times ignore the request, if turned off in db, ignore the request
  }
  db.child("motorController/command").set({
    current,
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

const bootstrap = (db) => {
 const getSettings = () => {
   return new Promise((res) => {
     db.once("value", (snapshot) => {
       res(snapshot.val());
     });
   })
  }

 const read = () => {
   const end = new Date();
   const start = new Date(end.getTime() - 5 * 60000);
   api.get(`/query_range?query=waterlevel&start=${start.toISOString()}&end=${end.toISOString()}&step=1m`).then(result=> {
     const { data } = result;
     if (data.status == 'success' && data?.data?.result) {
       // debug("result", data.data.result);
       // debug("values", data.data.result[0].values);
       measurements = data.data.result[0].values.map(x => parseInt(x[1]));
       getSettings().then(data => {
         controlMotor(db, measurements, data);
       });
     } else {
       debug("failure", data);
     }
   }).catch(error => {
     debug("error", error)
   });
  }
  
  if (config.env == 'dev') {
    read();
  } else {
    cron.schedule("* * * * *", () => {
      read();
    });
  }
}

exports.bootstrap = bootstrap;
