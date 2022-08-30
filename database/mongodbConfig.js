const { MongoClient } = require('mongodb');

const mongoURL = 'mongodb://localhost:27017/testDriver';

let _db;

const initDb = async callback => {
  if (_db) {
    console.log('Db is already initialized!');
    return callback(null, _db);
  }
  MongoClient.connect(mongoURL)
    .then(client => {
      _db = client.db();
      callback(null, _db);
    })
    .catch(err => {
      callback(err);
    });
};

const getDb = () => {
  if (!_db) {
    throw Error('Db not initialized');
  }
  return _db;
};

module.exports = {
  initDb,
  getDb
};