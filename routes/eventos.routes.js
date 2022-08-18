const { Router } = require("express");
const { check } = require("express-validator");
const { getEventos, getEvento, crearEvento, actualizarEvento, eliminarEvento, getPreciosByEvento, getEventosByRpp, agregarClientePuerta, getClientePuerta, quitarClientePuerta, setHashPuerta, setFinalizado, setAbierto } = require("../controllers/eventos.controller");
const { isDate } = require("../helpers/isDate");
const { validarCampos } = require("../middlewares/validar-campos");
const { validarJWT } = require("../middlewares/validar-jwt");

const router = Router();

router.use(validarJWT);
router.get("/", getEventos);
router.get("/rpp/:idrpp", getEventosByRpp);
router.get("/detalle/:id",[
    check("id", "No es un ID valido").isMongoId(),
    //check('id').custom(existsEventById)
],getEvento);
router.get("/:id/precios",[
    check("id", "No es un ID valido").isMongoId(),
    //check('id').custom(existsEventById)
],getPreciosByEvento);
router.get("/sethashpuerta/:evento",setHashPuerta);
router.post("/addpuerta",agregarClientePuerta);
router.post("/delpuerta",quitarClientePuerta);
router.get("/puerta/:evento",getClientePuerta);
router.post("/",crearEvento);
router.post("/finalizado",setFinalizado);
router.post("/abierto",setAbierto);
router.put("/:id",[
    // check("id", "No es un ID valido").isMongoId(),
    //check('id').custom(existsEventById),
    // validarCampos
],actualizarEvento);
router.delete("/:id",[
    //isAdminRole,
    //check("title", "El nombre es obligatorio").not().isEmpty(),
    check("id", "No es un ID valido").isMongoId(),
    //check('id').custom(existsEventById),
    validarCampos
],eliminarEvento);

module.exports = router;