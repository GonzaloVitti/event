const fs = require('fs');
const { clearScreenDown } = require('readline');
const { MessageMedia, Client } = require("whatsapp-web.js");
const axios = require('axios').default;
const { Cliente } = require("../models");

const checkAuth = async (req, res) => {
    if(estado === "Desconectado"){
        res.json({estado});
    }else{
        res.json({estado:"Conectado"});
    }
};

 const getQr = async (req, res) => {
    var qrjs = fs.readFileSync('./helpers/qrcode.js');
    fs.readFile('./helpers/last.qr', (err,last_qr) => {
        fs.readFile('./session.json', (serr, sessiondata) => {
            if (err && sessiondata) {
            } else  if (!err && serr) {
                var page = `
                    <html>
                    <head>
                        <title>Event App</title>
                    </head>
                        <body>
                            <script>${qrjs}</script>
                            <div style="display:flex;justify-content:center;align-items:center; flex-direction:column;">
                                <div id="qrcode"></div>
                                <a role="button" style="text-decoration:none; color:white" href="/"><button style="margin-top:50px;border:1px solid green;border-radius: 5px;background-color:green;text-align: center;padding: 10px 24px;font-size: 16px;color:white">Volver</button></a>
                            </div>
                            <script type="text/javascript">
                                new QRCode(document.getElementById("qrcode"), "${last_qr}");
                            </script>
                        </body>
                    </html>
                `
                res.status(200).json({
                    ok: true,
                    pagina: page,
                });
             }
        })
    });
};

const sendPdf = async (req, res) => {
    const {phone} = req.params;
    const {dni} = req.body;
    const cliente = await Cliente.findOne({dni});
    if(client.options.session!=false){
        if (phone == undefined || phone == 0 || dni == undefined || dni == 0) {
            res.json({ status: "error", message: "Ingrese un numero y un DNI válido" })
        } else {
            const response = await axios.get(cliente.ultComp,  { responseType: 'arraybuffer' })
            const pdf = Buffer.from(response.data, "utf-8")
            //const pdf = fs.readFileSync('./pdfs/comprobante-'+dni+'.pdf');
            const base64pdf = Buffer.from(pdf).toString('base64');
            const mediaFile = new MessageMedia('application/pdf', base64pdf,'Entrada-'+dni);
            client.sendMessage(`549${phone}@c.us`, mediaFile).then((response) => {
            if (response.id.fromMe) {
                res.json({ status: 'success', message: `PDF ha sido enviado exitosamente a +54 9 ${phone}` })
                }
            });
        }
    }else{
        res.json({ status: "error", message: "La sesion de Whatsapp expiro o no esta conectada" })
    }
};
const sendMessageAll = async (req, res) => {
    const { idevento,message } = req.params;
    const clientes = await Cliente.find({ estado: true, ticket:false , "entradas.evento": idevento });
    if(clientes.length>0){
        if(client.options.session!=false){
            for (let i = 0; i < clientes.length; i++) {
                client.sendMessage(`549${clientes[i].celular}@c.us`, message).then((response) => {
                });
            } 
            res.json({ ok: true, msg: `Los mensajes han sido enviados` })
        }else{
            res.json({ ok:false, msg: "La sesion de Whatsapp expiro o no esta conectada" })
        }
    }else{
        res.json({ ok:false, msg: "No hay clientes" })
    }
};
const sendMessageAllAll = async (req, res) => {
    const { message } = req.params;
    const clientes = await Cliente.find({ estado: true, ticket:false });
    if(clientes.length>0){
        if(client.options.session!=false){
            for (let i = 0; i < clientes.length; i++) {
                client.sendMessage(`549${clientes[i].celular}@c.us`, message).then((response) => {
                });
            } 
            res.json({ ok: true, msg: `Los mensajes han sido enviados` })
        }else{
            res.json({ ok:false, msg: "La sesion de Whatsapp expiro o no esta conectada" })
        }
    }else{
        res.json({ ok:false, msg: "No hay clientes" })
    }
};


module.exports = {
    getQr,
    checkAuth,
    sendPdf,
    sendMessageAll,
    sendMessageAllAll
};
  