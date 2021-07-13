const cron = require('node-cron');
const admin = require("firebase-admin");
const client = require('prom-client');
const config = require("./config/config");

const level = new client.Gauge({ name: 'waterlevel', help: 'water level at current time' });

let previousTimestamp;
const handleRead = (data) => {
  const { measurement, timestamp } = data.waterlevel;
  const { anomalyDistanceLimit, autoUpdateMinMax, brightness, printMode, maximumValue, minimumValue } = data.settings;

  let percentage = (100 - (((measurement - minimumValue) * 100) / Math.max((maximumValue - minimumValue), 1)));
  percentage = Math.round(Math.max(Math.min(100, percentage), 0));

  if (previousTimestamp != timestamp) {
    previousTimestamp = timestamp;
    console.log("Last water level: " + percentage + " at: " + (new Date(timestamp)));
    level.set(percentage);
  }
}

const setupCron = () => {
  admin.initializeApp({
    credential: admin.credential.cert(config.serviceAccount),
    databaseURL: config.databaseURL
  });
  
  const db = admin.database().ref()
  
  cron.schedule("* * * * *", () => {
    db.once("value", (snapshot) => {
      handleRead(snapshot.val());
    })
  });
}
setupCron();

