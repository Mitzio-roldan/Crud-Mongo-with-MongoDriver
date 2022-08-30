let userSchema =  {
    required: [ "Estado", "Data"],
    properties: {
       Estado: { bsonType: "string" ,  description: "estado"},
       Data: {
          bsonType: "object",
          required: [ "correo", "nombre", "numero", "dni", "password"],
          properties: {
             nombre: { bsonType: "string",  description: "nombre"},
             correo: { bsonType: "string",  description: "correo" },
             numero: { bsonType: "string",  description: "numero" },
             dni: { bsonType: "string" ,  description: "dni"},
             password: { bsonType: "string" ,  description: "password"},
             date: { bsonType: "string" ,  description: "date"},
             rol: {bsonType: "string" ,  description: "rol"}
          }
        },
    }
}
module.exports = userSchema