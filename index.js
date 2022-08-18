const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const { dbConnection, dbConnectionLocal } = require("./database/config");
const path = require("path");
const { Client,MessageMedia, LegacySessionAuth} = require('whatsapp-web.js');
const fs = require('fs');

//WSP
// const SESSION_FILE_PATH = './session.json';
// let sessionData;
// if (fs.existsSync(SESSION_FILE_PATH)) {
//   sessionData = require(SESSION_FILE_PATH);
// }
// global.client = new Client();

// global.client = new Client({
//   qrTimeoutMs:0,
//   takeoverOnConflict: true,
//   authTimeoutMs: 0,
//   restartOnAuthFail: true,
//   puppeteer: {
//       headless: true,
//       args: [
//           '--no-sandbox',
//           '--disable-setuid-sandbox',
//           '--unhandled-rejections=strict'
//   ]},
//   // authStrategy: new LegacySessionAuth({
//   //   session: sessionData // saved session object
//   // }),
//   // authStrategy: new LocalAuth(),
//   // authStrategy: new LegacySessionAuth(),
//   // session: sessionData,
  
//   takeoverTimeoutMs:0
// });

// let bandera = false;
// global.authed = false;
// global.estado = "Desconectado";

// Crear el servidor de express
const app = express();

// Base de datos
dbConnection();
// dbConnectionLocal();

// CORS
app.use(cors());

// Directorio Público
// app.use(express.static("public"));

app.use(express.static(path.join(__dirname, '/public')));

//BodyParser
app.use(bodyParser.json({ limit: '50mb' }));

// Lectura y parseo del body
app.use(express.json());

//WSP
app.use(bodyParser.urlencoded({ extended: true }));

// client.on('qr', qr => {
//   fs.writeFileSync('./helpers/last.qr', qr);
// });

// client.on('authenticated', (session) => {
//   console.log("Autorizando");
//   // sessionData = session;
  
//   // client.options.session = session;
  
//   // fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
//   //     if (err) {
//   //         console.error(err);
//   //     }
//   //     authed = true;
//   // });

//   try {
//     console.log("qr por eliminarse")
//       fs.unlink('./helpers/last.qr')
//       console.log("asdasdsadasdasdsa"+fs.existsSync('./helpers/last.qr'))
//   } catch(err) {}
// });

// client.on('auth_failure', () => {
//   console.log('Error de autenticacion vuelve a generar el QRCODE');
//   // let sessionFile = fs.readFileSync('./session.json');
//   // if(sessionFile){
//   //   fs.unlinkSync('./session.json');
//   // }
//   // sessionCfg = "";
//   // process.exit();
// });

// client.on('ready', async() => {
//   console.log("El cliente esta listo");
//   estado = await client.getState();
// });

// client.on('disconnected', ()=>{
//       console.log('Se ha desconectado');
//       // let sessionFile = fs.readFileSync('./session.json');
//       // if(sessionFile){
//       //   fs.unlinkSync('./session.json');
//       // };
//       estado="Desconectado";
//       process.exit();
// });

// client.initialize();


// Rutas
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/clientes", require("./routes/clientes.routes"));
app.use("/api/eventos", require("./routes/eventos.routes"));
app.use("/api/wsp",require("./routes/wsp.routes"));
app.get('/*', function (req, res) {res.sendFile(path.join(__dirname, 'public', 'index.html'));});
app.get('/', function (req, res) {res.sendFile(path.join(__dirname, 'public', 'index.html'));});

// Escuchar peticiones
app.listen(process.env.PORT, () => {
  console.log(`Servidor corriendo en puerto ${process.env.PORT}`);
});