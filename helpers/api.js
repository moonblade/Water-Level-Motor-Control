const axios = require("axios");

const api = axios.create({
  baseURL: 'http://rpi:40001/api/v1'
});

module.exports = api;
