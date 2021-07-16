env = process.env.ENV == 'dev' ? 'dev' : 'prod';
serviceAccount = require("./water-level-indicator-a555e-81463e26b5ff.json")
module.exports = {
  serviceAccount,
  env,
  databaseURL: "https://water-level-indicator-a555e-default-rtdb.firebaseio.com/",
}
