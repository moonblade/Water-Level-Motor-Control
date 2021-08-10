const promBundle = require('express-prom-bundle');
const client = require('prom-client');
const cors = require("cors");
const express = require('express');
const bodyParser = require("body-parser");
const path = require("path");
const helpers = require("./helpers");
const { getAutomaticControl } = require("./helpers/logger");
const { setAutoControl, setMotorState, setDbValue, getDbValue } = require("./helpers/motorController");

setTimeout(helpers.bootstrap, 5 * 60 * 1000)

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(promBundle());
client.collectDefaultMetrics();

// app.get('/', (req, res) => {
  // res.send("Server setup for grafana metrics");
// });
app.get("/automaticControl", (req, res) => {
  res.json({ automaticControl: getAutomaticControl() });
});

app.post("/automaticControl", (req, res) => {
  setAutoControl(req.query.value == 'true' ? 1 : 0);
  res.status(200).end();
});

app.post("/setMotorState", (req, res) => {
  setMotorState(req.query.command == "on" ? "on" : "off");
  res.status(200).end();
});
app.post("/setDbValue", (req, res) => {
  setDbValue(req.query.key, req.query.value);
  res.status(200).end();
});

app.post("/getDbValue", async (req, res) => {
  const value = await getDbValue(req.query.key);
  return res.json({ value });
});

app.use('/', express.static(path.join(__dirname, "public")));

app.listen(40002);
