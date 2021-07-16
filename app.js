const promBundle = require('express-prom-bundle');
const client = require('prom-client');
const express = require('express');
const helpers = require("./helpers");

helpers.bootstrap();

const app = express();

app.use(promBundle());
client.collectDefaultMetrics();

app.get('/', (req, res) => {
  res.send("Server setup for grafana metrics");
});

app.listen(40002);
