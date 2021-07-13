const promBundle = require('express-prom-bundle');
const client = require('prom-client');
const express = require('express');

require("./cronHelper");

const app = express();

app.use(promBundle());
client.collectDefaultMetrics();

app.get('/', (req, res) => {
  res.send("Server setup for grafana metrics");
});

app.listen(40002);
