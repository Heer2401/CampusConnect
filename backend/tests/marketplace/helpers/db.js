const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

const connectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    driverInfo: { name: 'nodejs', version: '6.0.0' }
  });
};

const clearDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
};

const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};

module.exports = {
  connectDB,
  clearDB,
  closeDB,
};
