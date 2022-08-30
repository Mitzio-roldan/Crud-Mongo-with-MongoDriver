const express = require('express')
const cors = require('cors')
const mongodb = require('../database/mongodbConfig')
 


class server{

    constructor(){
        this.app = express();
        this.port = process.env.PORT
        this.middlwares()
        this.routes()
        this.connectDb()
        
   
    }
    middlwares(){
        this.app.use(cors())
        this.app.use(express.json())
    }
    connectDb(){
        mongodb.initDb((err, mongodb ) => {
            if (err) {
              console.log(err);
            } else {
              console.log('Mongo ok');
            }
          });
    }
   
    routes(){
        
        this.app.use('/api/usuarios', require('../routes/user'))
        
    }
    listen(){
        this.app.listen(this.port, () => {
            console.log(`Example app listening on port ${this.port}`)
          })
    }
}
module.exports = server