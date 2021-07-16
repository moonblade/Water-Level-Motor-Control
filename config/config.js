env = process.env.ENV == 'dev' ? 'dev' : 'prod';
serviceAccount = require("./water-level-indicator-a555e-81463e26b5ff.json")
module.exports = {
  serviceAccount,
  env,
  databaseURL: "https://water-level-indicator-a555e-default-rtdb.firebaseio.com/",
  // turn off motor of this many minutes
  turnMotorOffMins: 15,
  // turn on motor if less than this percent
  motorOnThreshold: 20,
  // turn off motor if more than this percent
  motorOffThreshold: 80
}
