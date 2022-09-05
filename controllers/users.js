const { response, query } = require("express");
const mongodb = require("../database/mongodbConfig");
var bcrypt = require("bcryptjs");
const userSchema = require("../schemas/schemaUser");

let db;

// comprueba conexion con la base de datos
async function checkDb() {
  if (!db) {
    db = await mongodb.getDb();
  }
}

const controller = {
  usuariosGet: async (req, res = response) => {
    // comprueba conexion con la base de datos
    console.log(await mongodb._db);
    await checkDb();

    const { limit = 5, desde = 0 } = req.query;

    // find All con limite y desde
    const resultado_usuarios = db
      .collection("Usuarios")
      .find()
      .limit(parseInt(limit))
      .skip(parseInt(desde));

    // devuelve los resultados
    const results = await resultado_usuarios.toArray();

    res.status(200).json({
      count: results.length,
      results,
    });
  },

  usuariosPost: async (req, res) => {
    // comprueba conexion con la base de datos
    await checkDb();

    const { nombre, correo, password, dni, numero, rol } = req.body;

    let today = new Date();
    let date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();

    const data = {
      nombre,
      correo,
      password,
      dni,
      numero,
      date: date,
      rol,
    };

    let salt = bcrypt.genSaltSync(10);
    data.password = bcrypt.hashSync(req.body.password, salt);

    // IMPORTANTE alternativa: crear scrip para el inicio que cree las colecciones si no existen y si existen que apliquen el validador
    // falla si la coleccion no está creada

    // Asigna la validacion a la coleccion
    db.command({
      // Nombre de la coleccion
      collMod: "Usuarios",
      // Validador
      validator: {
        // Inserta schema propio
        $jsonSchema: userSchema,
      },
    });

    try {
      // selecciona coleccion, inserta la data y crea el indice
      const resultado_usuario = await db
        .collection("Usuarios")
        .insertOne({ Data: data, Estado: "Activo" });
      await db
        .collection("Usuarios")
        .createIndex({ "Data.correo": 1, "Data.dni": 1 }, { unique: true });

      res.json({
        resultado_usuario,
      });
    } catch (error) {
      // catch para evaluar los errores de la validacion
      console.log(error);
      return res.status(400).json({
        msg: error,
      });
    }
  },

  usuarioPut: async (req, res) => {
    // comprueba conexion con la base de datos
    await checkDb();

    const { oldcorreo, correo } = req.body;

    // Actualiza un documento de la coleccion, buscando por el correo
    const result = await db.collection("Usuarios").updateOne(
      // Busca el documento
      { "Data.correo": oldcorreo },
      {
        // Actualiza el dato correo de la data
        $set: { "Data.correo": correo },
      }
    );

    // Comprueba la actualizacion
    if (result.modifiedCount > 0) {
      return res.json({
        msg: `User actualizado`,
      });
    }

    return res.json({
      msg: "No se actualizo nada",
    });
  },

  usuariosPorRol: async (req, res) => {
    // comprueba conexion con la base de datos
    await checkDb();

    const { nombre } = req.query;

    // const resultado_usuarios = db.collection('Rol').find({"nombre": new RegExp(nombre)})
    // devuelve los resultados
    // const results = await resultado_usuarios.toArray()

    // Busca los usuarios que contengan el rol obtenido del query
    const resultado_usuarios = db.collection("Usuarios").aggregate([
      {
        // crea la relacion de la coleccion rol y la de usuarios
        $lookup: {
          // Nombre de la tabla con la cual se aplica la relacion
          from: "Rol",
          // identificador del lado del usuario
          localField: "Data.rol",
          // identificador del lado del rol
          foreignField: "nombre",
          as: "role",
        },
      },
      // Condicional: Solo trae los usuarios con el rol designado en la query usando operador LIKE
      // la i del final es por la sensibilidad de las mayusculas
      // comodin adelante % = new RegExp( '^' + nombre, 'i')
      // comodin atras % = new RegExp( nombre + '$' , 'i')
      // comienze y termine  = new RegExp( '^' + nombre + '$' , 'i')
      // doble comodin = new RegExp(nombre, 'i')
      { $match: { "Data.rol": new RegExp("^" + nombre, "i") } },
      {
        // Como se muestra la informacion
        $project: {
          _id: 0,
          nombre: "$Data.nombre",
          correo: "$Data.correo",
          dni: "$Data.dni",
          numero: "$Data.numero",
          date: "$Data.date",
          rol: "$Data.rol",
          acceso: "$role.control",
        },
      },
      {
        // Orden de la informacion: Por nombre de forma Descendente
        $sort: { nombre: -1 },
      },
    ]);

    // Devuelve los resultados
    const results = await resultado_usuarios.toArray();

    res.status(200).json({
      count: results.length,
      results,
    });
  },

  usuariosDiferentes: async (req, res) => {
    await checkDb();

    // Obtengo el rol
    const { rol } = req.query;

    // find All con Data.rol diferente al rol obtenido anteriormente por req.query
    const resultado_usuarios = db.collection("Usuarios").find({
      // $ne= No es igual a
      "Data.rol": { $ne: rol },

      // *********************************
      // Alternativa usar operador $not
      // $not= negacion, $eq= igual a
      // "Data.rol": {$not:{$eq: rol}}
      // *********************************
    });

    // devuelve los resultados
    const results = await resultado_usuarios.toArray();

    res.status(200).json({
      count: results.length,
      results,
    });
  },

  Mayor_Menor_Igual: async (req, res) => {
    await checkDb();

    // Obtengo el metodo
    let { metodo, numero = 0 } = req.query;

    let resultado_usuarios;

    switch (metodo) {
      // Operador MAYOR y MAYOR O IGUAL
      case "mayor":
        // find All con Usuarios los cuales sus numeros son Mayores o Iguales al nuemero traido de la query
        resultado_usuarios = db.collection("Usuarios").find({
          // $gte= MAYOR O IGUAL
          //$gt= MAYOR
          "Data.numero": { $gte: numero },
        });

        break;

      // Operador MENOR y MENOR O IGUAL
      case "menor":
        // find All con Usuarios los cuales sus numeros son Menores o Iguales al nuemero traido de la query
        resultado_usuarios = db.collection("Usuarios").find({
          // $lte= MENOR O IGUAL
          //$lt= MENOR
          "Data.numero": { $lte: numero },
        });

        break;

      // Operador IGUAL
      case "igual":
        // find All con Usuarios los cuales sus numeros Iguales al nuemero traido de la query
        resultado_usuarios = db.collection("Usuarios").find({
          // $eq= IGUAL
          "Data.numero": { $eq: numero },
        });

        break;
    }

    // devuelve los resultados
    const results = await resultado_usuarios.toArray();

    res.status(200).json({
      count: results.length,
      results,
    });
  },

  And_Or: async (req, res) => {
    await checkDb();

    let resultado_usuarios;
    // Obtengo el metodo
    let { metodo } = req.query;
    switch (metodo) {
      // Operador OR
      case "or":
        resultado_usuarios = db
          .collection("Usuarios")
          .find({ $or: [{ "Data.rol": "User" }, { "Data.rol": "Admin" }] });

        break;

      // Operador AND
      case "and":
        resultado_usuarios = db
          .collection("Usuarios")
          .find({ $and: [{ "Data.rol": "User" }, { "Data.rol": "Admin" }] });

        break;
    }

    // devuelve los resultados
    const results = await resultado_usuarios.toArray();

    res.status(200).json({
      count: results.length,
      results,
    });
  },
};

module.exports = controller;
