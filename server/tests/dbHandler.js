const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

/** Starts an in-memory MongoDB instance and connects Mongoose to it. */
async function connect() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGO_URI);
}

/** Wipes all collections — call between tests for isolation. */
async function clearDatabase() {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

/** Disconnects and stops the in-memory server — call once after all tests. */
async function closeDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

module.exports = { connect, clearDatabase, closeDatabase };
