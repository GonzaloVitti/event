const { Router } = require("express");
const { getQr, sendPdf, checkAuth, sendMessageAll, sendMessageAllAll } = require("../controllers/wsp.controller");

const router = Router();

router.get("/auth/getqr", getQr);
router.get("/auth/checkauth", checkAuth);
router.post("/chat/sendpdf/:phone", sendPdf);
router.get("/chat/sendmessages/:idevento/:message", sendMessageAll);
router.get("/chat/sendmessages/:message", sendMessageAllAll);

module.exports = router;