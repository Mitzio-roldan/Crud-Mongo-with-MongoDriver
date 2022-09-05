const {Router} = require('express')
const controllerUser = require('../controllers/users')


const router = Router()

router.get('/', controllerUser.usuariosGet)


router.post('/',controllerUser.usuariosPost)


router.put('/', controllerUser.usuarioPut)


router.get('/rol', controllerUser.usuariosPorRol)


router.get('/diferente', controllerUser.usuariosDiferentes)


router.get('/mayor_menor_igual', controllerUser.Mayor_Menor_Igual)


router.get('/and_or', controllerUser.And_Or)



module.exports = router