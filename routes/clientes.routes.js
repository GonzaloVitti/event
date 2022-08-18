const { Router } = require("express");
const { check } = require("express-validator");
const { getClientes, getClienteByRpp, crearCliente, actualizarCliente, eliminarCliente, verificarClienteByDni, getClientesVerificados, asociarEventoCliente, getClientesByEvento, desasociarEventoCliente, getClientesBuscados, verificarCliente, actualizarrCliente, verificarHash, setHash, subirArchivo, setHashPuerta, getClienteEdit, actualizarrClientee, getClientesByEventoAndRRPP, crearClienteFree,actualizarClienteFree, actualizarrClienteFree, getClientesFreeByRRPP, getClientesPorTarjeteroBuscados, desasociarEventoClienteSinEvento, getClientesFreeByEvento, resetearIngresos, resetearFREE, pasarPagoAFree, actualizarrClienteByAdmin, getClientesBuscadosTotal, getClientesVeriBuscados, crearClienteFreeTicket, getTicketsFreeByEvento, loginClienteFree, autoCargaFree, autoActualizarFree, agregarticketfalse, setHashSinToken, verificarClienteByDniSinUpdate, subirArchivoSinToken, verificarClienteSinToken, resetearTODO, getClientesAll, deleteCliente, updateClienteByAdmin, getClientesBuscadosTotalAdmin, reenviarWSP, descargarPDF, getCliente, getCelularesByEvento, sacarTodos, crearClienteMasivo } = require("../controllers/clientes.controller");
const { isDate } = require("../helpers/isDate");
const { validarCampos } = require("../middlewares/validar-campos");
const { validarJWT } = require("../middlewares/validar-jwt");

const router = Router();
router.get("/edit/:id",getClienteEdit);
router.post("/fileuploadsintoken",subirArchivoSinToken);
router.post(
    "/ingresofree",
    [
      check("id", "Tiene que ser un id valido").isMongoId(),
      validarCampos,
    ],
    loginClienteFree
);
router.put("/autocargafree",autoCargaFree);
router.put("/autoupdatefree",autoActualizarFree);
router.post("/sethashsintoken",setHashSinToken);
router.get("/verificardbsintoken/:dni", verificarClienteSinToken);
router.get("/clientepapdf/:idevento/:id",
[check("id", "No es un ID valido").isMongoId(),
check("idevento", "No es un ID valido").isMongoId(),
], getCliente)
router.use(validarJWT)

// router.get("/agregarticketfalse", agregarticketfalse);
router.get("/", getClientes);
router.get("/all", getClientesAll);
router.get("/verificados/:idevento", getClientesVerificados);
router.get("/search/:apellido/:id", getClientesBuscados);
router.get("/searcht/:apellido/:evento", getClientesBuscadosTotal);
router.get("/searchtadmin/:apellido", getClientesBuscadosTotalAdmin);
router.get("/searchv/:apellido/:evento", getClientesVeriBuscados);
router.post("/resetfree",resetearFREE);
router.get("/reenviarwsp/:id/:idevento",reenviarWSP);
router.get("/resettodo",resetearTODO);
router.post("/sacartodos",sacarTodos);
router.get("/resetingresos",resetearIngresos);
router.get("/pagotofree",pasarPagoAFree);
router.get("/searchportar/:apellido/:id", getClientesPorTarjeteroBuscados);
router.get("/verificardb/:dni", verificarCliente);
router.get("/:uid",[
    check("uid", "No es un ID valido").isMongoId(),
    //check('id').custom(existsEventById)
],getClienteByRpp);
router.get("/evento/:idevento",[
    // check("uid", "No es un ID valido").isMongoId(),
    //check('id').custom(existsEventById)
],getClientesByEvento);
router.get("/getfree/:id",getClientesFreeByRRPP);
router.get("/getfreeevento/:idevento",getClientesFreeByEvento);
router.get("/getfreetickets/:idevento",getTicketsFreeByEvento);
router.get("/rrpp/:id/evento/:idevento",[
    // check("uid", "No es un ID valido").isMongoId(),
    //check('id').custom(existsEventById)
],getClientesByEventoAndRRPP);
router.get("/dnisinupdate/:dni/:idevento/:fecha",verificarClienteByDniSinUpdate);
router.get("/dni/:dni/:idevento",verificarClienteByDni);
router.get("/hash/:hash/:idevento",verificarHash);
router.post("/sethash",setHash);
router.post("/asociar", asociarEventoCliente);
router.post("/desasociar", desasociarEventoCliente);
router.post("/desasociarsinevento", desasociarEventoClienteSinEvento);
router.post("/",crearCliente);
router.post("/massive",crearClienteMasivo);
router.post("/freeticket",crearClienteFreeTicket);
router.post("/free",crearClienteFree);
router.post("/fileupload",subirArchivo);
router.post("/updatefree",actualizarrClienteFree);
router.post("/update",actualizarrCliente);
router.put("/edittadmin",updateClienteByAdmin);
router.put("/editt",actualizarrClienteByAdmin);
router.put("/:id",[
    check("id", "No es un ID valido").isMongoId(),
    //check('id').custom(existsEventById),
    validarCampos
],actualizarCliente);
router.delete("/delete",[
    check("id", "No es un ID valido").isMongoId(),
    validarCampos
],deleteCliente);
router.delete("/:id",[
    //isAdminRole,
    //check("title", "El nombre es obligatorio").not().isEmpty(),
    check("id", "No es un ID valido").isMongoId(),
    //check('id').custom(existsEventById),
    validarCampos
],eliminarCliente);

module.exports = router;