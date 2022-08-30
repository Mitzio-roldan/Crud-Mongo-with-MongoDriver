const {Router} = require('express')
const controllerUser = require('../controllers/users')


const router = Router()

router.get('/', controllerUser.usuariosGet)


router.post('/',controllerUser.usuariosPost)


router.put('/', controllerUser.usuarioPut)


router.get('/rol', controllerUser.usuariosPorRol)


module.exports = router