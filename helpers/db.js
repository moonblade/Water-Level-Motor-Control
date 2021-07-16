const admin = require("firebase-admin");
const config = require("../config/config");

const bootstrapFirebase = () => {
  admin.initializeApp({
    credential: admin.credential.cert(config.serviceAccount),
    databaseURL: config.databaseURL
  });
  const db = admin.database().ref()
  return db;
}

exports.bootstrapFirebase = bootstrapFirebase;
