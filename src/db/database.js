const mongoose = require("mongoose");
const mongoUri = process.env.MONGO_URI;
async function ConnectToDb() {
  try {
    await mongoose.connect(mongoUri);
    console.log(`"MONGO_DB COMPASS is connected"`);
  } catch (error) {
    console.log(error);
  }
}

module.exports = ConnectToDb;
