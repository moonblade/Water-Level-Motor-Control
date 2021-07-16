const cron = require('node-cron');
const client = require('prom-client');
const config = require("../config/config");
const api = require("./api");
const debug = require("debug")("water-motorHelper");

const motorState = new client.Gauge({ name: 'motorstate', help: 'current state of motor' });

let previousTimestamp;
const handleMotorAction = (data) => {
  const { measurement, timestamp } = data.waterlevel;
  const { anomalyDistanceLimit, autoUpdateMinMax, brightness, printMode, maximumValue, minimumValue } = data.settings;

  let percentage = (100 - (((measurement - minimumValue) * 100) / Math.max((maximumValue - minimumValue), 1)));
  percentage = Math.round(Math.max(Math.min(100, percentage), 0));

  if (previousTimestamp != timestamp) {
    previousTimestamp = timestamp;
    console.log("Last water level: " + percentage + " at: " + (new Date(timestamp)));
    level.set(percentage);
    measureGauge.set(measurement);
  }
}

const controlMotor = (measurements, data) => {
  debug(measurements, data);
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
       debug("result", data.data.result);
       debug("values", data.data.result[0].values);
       measurements = data.data.result[0].values.map(x => parseInt(x[1]));
       getSettings().then(data => {
         controlMotor(measurements, data);
       });
       debug(measurements)
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
