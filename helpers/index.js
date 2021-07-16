const db = require("./db");
const logger = require("./logger")
const motorHelper = require("./motorController");

const bootstrap = () => {
  const dbInstance = db.bootstrapFirebase();
  logger.bootstrap(dbInstance);
  motorHelper.bootstrap(dbInstance);
}

exports.bootstrap = bootstrap;
