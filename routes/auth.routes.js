/*
    Rutas de Usuarios / Auth
    host + /api/auth
*/
const { Router } = require("express");
const { check } = require("express-validator");
const { validarCampos } = require("../middlewares/validar-campos");
const {
  crearUsuario,
  loginUsuario,
  revalidarToken,
  getRpps,
  asociarEventoRpp,
  getRppsByEvento,
  eliminarRpp,
  desasociarEventoRpp,
  getRppsByGeneral,
  getGananciaByGeneral,
  getGananciaByOperativo,
  getDeudaByAdmin,
  getRppsBuscados,
  getAllRppsBuscados,
  getDeuGanByEvento,
  getRppsGenerales,
  getRrppsByEvento,
  getDeudaByAdminMasRapida,
  getRrppEdit,
  actualizarRrpp,
  getRppsParaTicket,
  getRrppsByEventoParaAsociar,
  eliminarRppEvento,
  getDeudaByEventoByAdmin,
  getRppsByRRPP,
  getGananciaTotalByOperativo,
} = require("../controllers/auth.controller");
const { validarJWT } = require("../middlewares/validar-jwt");

const router = Router();

router.post(
  "/new",
  [
    // middlewares
    check("nombre", "El nombre es obligatorio").not().isEmpty(),
    check("email", "El email es obligatorio").isEmail(),
    check("password", "El password debe de ser de 6 caracteres").isLength({
      min: 6,
    }),
    validarCampos,
  ],
  crearUsuario
);

router.post(
  "/",
  [
    check("email", "El email es obligatorio").isEmail(),
    check("password", "El password debe de ser de 6 caracteres").isLength({
      min: 6,
    }),
    validarCampos,
  ],
  loginUsuario
);

router.get("/renew", validarJWT, revalidarToken);

router.post("/asociar", asociarEventoRpp);
router.post("/desasociar", desasociarEventoRpp);
router.get("/rpps", getRpps);
router.get("/rppstickets", getRppsParaTicket);
router.get("/rpps/rpps", getRppsGenerales);
router.get("/rpps/:idevento", getRppsByEvento);
router.get("/rrpps/:idevento", getRrppsByEvento);
router.get("/rrpps/byrrpp/:id", getRppsByRRPP);
router.get("/rrppsparaasociar/:idevento", getRrppsByEventoParaAsociar);
router.get("/rpps/general/:id", getRppsByGeneral);
router.get("/rpps/ganancia/:id", getGananciaByGeneral);
router.get("/rpps/gananciaop/:id", getGananciaByOperativo);
router.get("/rpps/gananciatotalop/:id/:idevento", getGananciaTotalByOperativo);
router.get("/rpps/deudad/:id", getDeudaByAdmin);
router.get("/rpps/deudabyevento/:idevento", getDeudaByEventoByAdmin);
router.get("/rpps/deudadrapida/:id", getDeudaByAdminMasRapida);
router.get("/eventos/deugan/:idevento", getDeuGanByEvento);
router.get("/search/:apellido/:id", getRppsBuscados);
router.get("/search/:apellido", getAllRppsBuscados);
router.get("/edit/:id", getRrppEdit);
router.put("/editt",actualizarRrpp);
router.delete("/desasociarevento/:uid/:eid",[
  check("uid", "No es un ID usuario valido").isMongoId(),
  check("eid", "No es un ID evento valido").isMongoId(),
  validarCampos
],eliminarRppEvento);
router.delete("/:id",[
  //isAdminRole,
  //check("title", "El nombre es obligatorio").not().isEmpty(),
  check("id", "No es un ID valido").isMongoId(),
  //check('id').custom(existsEventById),
  validarCampos
],eliminarRpp);


module.exports = router;
