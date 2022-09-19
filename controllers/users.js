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
  
   Delete: async(req, res) =>{

    // comprueba conexion con la base de datos
    await checkDb();

    const { correo } = req.body;

    // se puede usar deleteMany tambien, para eliminar mas de 1 documento
    // Realiza el delete de la coleccion usuarios, que tenga el correo igual al obtenido del body
    const result = await db.collection("Usuarios").deleteOne({'Data.correo' : correo});

    // Comprueba la eliminacion 
    if (result.deletedCount === 1) {
      return res.json({
        msg: 'User Eliminado'
      })
    } else {
      return res.json({
        msg: 'User No encontrado'
      })
    }

  },
 
  // Consulta completa
  // url referencia para regex https://ligengxin96.github.io/sql-in-mongodb/
  Consulta: async(req = request, res = response) =>{
    

    
    await checkDb();

    console.log(request.headers['x-forwarded-for']);

    const {consulta, coleccion, ordenar, limit, skip, concatenar} = req.headers
    
    const consultaObj = JSON.parse(consulta)
    
    function iterarArray(array){
      
      for (const iterator of array) {
          
          if(iterator.hasOwnProperty('$and')){
            iterarArray(iterator['$and']);
          }

          if(iterator.hasOwnProperty('$or')){
            iterarArray(iterator['$or']);
          }
          
          if (iterator.hasOwnProperty('idColeccion')) {
                  
            array.unshift({"_id": new ObjectId(`${iterator['idColeccion']}`)})
            delete array[iterator]
            
            const index = array.indexOf(iterator);
            if (index > -1) { 
            array.splice(index, 1); 

          }

          }
      }
      
    }



    if (consultaObj.hasOwnProperty('$and') || consultaObj.hasOwnProperty('$or') ){
        
      Object.keys(consultaObj).forEach((iterator, index) =>{
          
          if(Array.isArray(consultaObj[iterator])){
            iterarArray(consultaObj[iterator])  
          }

          if (iterator == 'idColeccion') {
            consultaObj['_id'] = new ObjectId(`${consultaObj[iterator]}`)
            delete consultaObj[iterator]
          }
          
        })
        
    }
    
    const OrdenarObj = ordenar ? JSON.parse(ordenar) : ''
    
    let ConcatArray = []
    let myArray =[]
    let setArray = []
    let addFieldsArray= []

    
    if (ordenar) {
      myArray.push({$sort:OrdenarObj})
    }
    if (skip) {
      myArray.push({$skip: parseInt(skip)})
    }
    if (limit) {
      myArray.push({$limit:parseInt(limit)})
    }

    if (concatenar) {
      
      let concatenarObj = JSON.parse(concatenar)
      
      if (concatenarObj.length >= 2) {
        
        
      concatenarObj.forEach(element => {
        
        if (element['localFieldLista']) {
          
          element = {
            from: element['from'],
            localField: element['localFieldLista'],
            foreignField: element['foreignField'],
            as: element['as'],
          }

          let mySubString = element.localField.substring(
            element.localField.indexOf("[") + 1, 
            element.localField.lastIndexOf("]")
        );

        let secondString = element.localField.substring(
          element.localField.indexOf(""),
          element.localField.lastIndexOf("[")
      );
      
        addFieldsArray.push({
          $addFields: {
            [element.localField]:{
  
              $arrayElemAt: [`$${secondString}`, parseInt(mySubString)]
            }
          }
        })

        }
        if (element['foreignField'] == 'idColeccion') {
          
          element['foreignField'] = '_id'   
               
          setArray.push({$set: { [element.localField]: {$toObjectId: `$${element['localField']}`}}})
        }
  
        
        ConcatArray.push({$lookup: element})
      });

      }
      else{
        
        if (concatenarObj['localFieldLista']) {
          concatenarObj = {
            from: concatenarObj['from'],
            localField: concatenarObj['localFieldLista'],
            foreignField: concatenarObj['foreignField'],
            as: concatenarObj['as'],
          }
          
          let mySubString = concatenarObj.localField.substring(
            concatenarObj.localField.indexOf("[") + 1, 
            concatenarObj.localField.lastIndexOf("]")
        );

        let secondString = concatenarObj.localField.substring(
          concatenarObj.localField.indexOf(""),
          concatenarObj.localField.lastIndexOf("[")
      );
      
        addFieldsArray.push({
          $addFields: {
            [concatenarObj.localField]:{
  
              $arrayElemAt: [`$${secondString}`, parseInt(mySubString)]
            }
          }
        })

        }
        if (concatenarObj['foreignField'] == 'idColeccion') {
        
          concatenarObj['foreignField'] = '_id'        
          setArray.push({$set: { [concatenarObj.localField]: {$toObjectId: `$${concatenarObj['localField']}`}}})
        }
  
        ConcatArray.push({$lookup: concatenarObj})
      }
    }
      
    
    
  
    const resultado_usuarios = db.collection(`${coleccion}`).aggregate([

      
      ...addFieldsArray,
     
      ...setArray,
      
      { $match: consultaObj },
      
      ...ConcatArray,      

      ...myArray
      
    ]);


    const resultado = await resultado_usuarios.toArray();


    return res.json({
      count: resultado.length,
      resultado: resultado,
    })


    
    // Logica Anterior ***
    // const valorKeySplit = valorkey.split(';') Or[nombre, rol]; estado
    // const valorSplit = valor.split(';') Or[nombre11, Admin]; activo
    // const operadorSplit = operador.split(';') Or[=, =]; =
    // Obtener= Data.nombre, Data.correo
    // let operacionFinal

  //   for (const item of valorKeySplit) {
      
  //     //.find({ $or: [{ "Data.rol": "User" }, { "Data.rol": "Admin" }] });
  //     if (item.includes('Or') ) {
        
  //       let result = item.replace('Or', '{"$or":')
  //       result = result.replace('[', '[{')
  //       result = result.replace(']', '}] }')
        
  //       const Parametro1 = result.substring(
  //         result.indexOf(",") + 2, 
  //         result.lastIndexOf("}") - 3
  //     );
      
  //     const Parametro2 = result.substring(
  //       result.indexOf("[{") + 2,
  //       result.lastIndexOf(",")
  //   );
  //   result = result.replace(`${Parametro1}`, `"${Parametro1}":`)
  //   result = result.replace(`${Parametro2}`, `"${Parametro2}":`)
  //   operacionFinal = result
      
  //   for (const item of valorSplit) {
  //     if (item.includes('Or') ) {
        
  //       let resultsssss = item.replace('Or[', '')
  //       console.log(resultsssss);
        
  //       resultsssss = resultsssss.replace(']', '')
        
  //       resultsssss = resultsssss.split(',')

        
  //       console.log(resultsssss);
  //       const Parametro1De2 = operacionFinal.substring(
  //         operacionFinal.indexOf(`"${Parametro1}"`), 
  //         operacionFinal.lastIndexOf(":") + 1
  //         );
          
  //         operacionFinal = operacionFinal.replace(`${Parametro1De2}`, `${Parametro1De2} "${resultsssss[0]}"`)
          
  //         const Parametro2De2 = operacionFinal.substring(
  //           operacionFinal.indexOf(`"${Parametro2}"`), 
  //           operacionFinal.lastIndexOf(":,") + 1
  //           );
  //           console.log(Parametro2De2);

  //           operacionFinal = operacionFinal.replace(`${Parametro2De2}`, `${Parametro2De2} "${resultsssss[1]}"`)
  //           console.log(operacionFinal);
    
  //           let theobj = JSON.parse(operacionFinal);
  //           console.log('******************************');
  //           console.log(theobj);
  //   }






  //     }
  //   }
    
  //   // const resultado_usuarios = db.collection(`${coleccion}`).aggregate([
  //   //   {
  //   //     // crea la relacion de la coleccion rol y la de usuarios
  //   //     $lookup: {
  //   //       // Nombre de la tabla con la cual se aplica la relacion
  //   //       from: "Rol",
  //   //       // identificador del lado del usuario
  //   //       localField: "Data.rol",
  //   //       // identificador del lado del rol
  //   //       foreignField: "nombre",
  //   //       as: "role",
  //   //     },
  //   //   },
  //   //   // Condicional: Solo trae los usuarios con el rol designado en la query usando operador LIKE
  //   //   // la i del final es por la sensibilidad de las mayusculas
  //   //   // comodin adelante % = new RegExp( '^' + nombre, 'i')
  //   //   // comodin atras % = new RegExp( nombre + '$' , 'i')
  //   //   // comienze y termine  = new RegExp( '^' + nombre + '$' , 'i')
  //   //   // doble comodin = new RegExp(nombre, 'i')
  //   //   { $match: { "Data.rol": new RegExp("^" + nombre, "i") } },
  //   //   {
  //   //     // Como se muestra la informacion
  //   //     $project: {
  //   //       _id: 0,
  //   //       nombre: "$Data.nombre",
  //   //       correo: "$Data.correo",
  //   //       dni: "$Data.dni",
  //   //       numero: "$Data.numero",
  //   //       date: "$Data.date",
  //   //       rol: "$Data.rol",
  //   //       acceso: "$role.control",
  //   //     },
  //   //   },
  //   //   {
  //   //     // Orden de la informacion: Por nombre de forma Descendente
  //   //     $sort: { nombre: -1 },
  //   //   },
  //   // ]);

  //   // Devuelve los resultados
  //   //const results = await resultado_usuarios.toArray();

    
    
    
    
    
    
    
    
    
    
  //   return res.json({
  //     msg: 'todo ok'
  //   })

  

  // }
},
};

module.exports = controller;
