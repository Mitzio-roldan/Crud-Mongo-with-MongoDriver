const { response, query } = require('express')
const mongodb = require('../database/mongodbConfig')
var bcrypt = require('bcryptjs');
const userSchema = require('../schemas/schemaUser')

let db

// comprueba conexion con la base de datos 
async function checkDb() {
    if (!db) {
        db = await mongodb.getDb()
    }
}



const controller = {

    usuariosGet: async (req, res = response) => {
        // comprueba conexion con la base de datos 
        await checkDb()

        const { limit = 5, desde = 0 } = req.query
        // find All con limite y desde 
        const resultado_usuarios = db.collection('Usuarios').find().limit(parseInt(limit)).skip(parseInt(desde))
        // devuelve los resultados
        const results = await resultado_usuarios.toArray()

        res.status(200).json({
            results,
            count: results.length
        })

    },

    usuariosPost: async (req, res) => {

        // comprueba conexion con la base de datos 
        await checkDb()

        const { nombre, correo, password, dni, numero, rol } = req.body

        let today = new Date();
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();

        const data = {
            nombre,
            correo,
            password,
            dni,
            numero,
            date: date,
            rol
        }
        
        let salt = bcrypt.genSaltSync(10);
        data.password = bcrypt.hashSync(req.body.password, salt);

        // IMPORTANTE alternativa: crear scrip para el inicio que cree las colecciones si no existen y si existen que apliquen el validador
        // falla si la coleccion no está creada

        db.command({
            "collMod": "Usuarios",
            "validator": {
                $jsonSchema: userSchema
            }
        })
        try {

            // selecciona coleccion, inserta la data y crea el indice
            const resultado_usuario = await db.collection('Usuarios').insertOne({ Data: data, Estado: "Activo" })
            await db.collection('Usuarios').createIndex({ "Data.correo": 1 }, { unique: true });

            res.json({
                resultado_usuario
            })


        } catch (error) {
            // catch para evaluar los errores de la validacion
            console.log(error);
            return res.json({
                msg: error
            })
        }

    },

    usuarioPut: async (req, res) => {
        // comprueba conexion con la base de datos 
        await checkDb()

        const { oldcorreo, correo } = req.body

        const result = await db.collection('Usuarios').updateOne(
            { "Data.correo": oldcorreo },
            {
                $set: { 'Data.correo': correo }
            }
        )

        if (result.modifiedCount > 0) {
            return res.json({
                msg: `User actualizado`
            })
        }

        return res.json({
            msg: "No se actualizo nada"
        })


    },

    usuariosPorRol: async (req, res) => {
        // comprueba conexion con la base de datos 
        await checkDb()

        const { nombre } = req.query

        // const resultado_usuarios = db.collection('Rol').find({"nombre": new RegExp(nombre)})
        // devuelve los resultados
        // const results = await resultado_usuarios.toArray()
        const resultado_usuarios = db.collection('Usuarios').aggregate([

            {
                $lookup: {
                    from: 'Rol',
                    localField: 'Data.rol',
                    foreignField: 'nombre',
                    as: 'role'
                }
            },
            { $match: { 'Data.rol': new RegExp(nombre) } },
            {
                $project:
                {
                    _id: 0,
                    nombre: '$Data.nombre',
                    correo: '$Data.correo',
                    dni: '$Data.dni',
                    numero: '$Data.numero',
                    date: '$Data.date',
                    rol: '$Data.rol',
                    acceso: '$role.control'
                }
            },
            {
                $sort:{nombre:-1}
            }
        ])

        const results = await resultado_usuarios.toArray()


        res.status(200).json({
            count: results.length,
            results
        })


    }

}

module.exports = controller;