const { MongoClient } = require('mongodb');

// URL mongo 
const mongoURL = 'mongodb://localhost:27017/testDriver';

let _db;

let valorTMP = 'pepe'

const initDb = async callback => {
  // Comprueba si esta iniciada
  if (_db) {
    console.log('Db ya está iniciada');
    return callback(null, _db);
  }
  // Se conecta a la base de datos
  MongoClient.connect(mongoURL, {maxPoolSize:10})
    .then(client => {
      // Asigna la db a la variable 
      _db = client.db();
      // Devuelve la db
      callback(null, _db);
    })
    .catch(err => {
      callback(err);
    });
};

// Devuelve la db 
const getDb = () => {
  // Comprueba si está iniciada
  if (!_db) {
    console.log('no existo')
    throw Error('Db no iniciada');
  }
  console.log('si existo')
  // Devuelve la db
  return _db;
};


const getValorTMP = () => {
  return valorTMP;
};

module.exports = {
  initDb,
  getDb,
  _db,
  getValorTMP
};