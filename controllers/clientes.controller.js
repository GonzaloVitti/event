const moment = require("moment");
const Usuario = require("../models/usuario");
const Cliente = require("../models/cliente");
const bcrypt = require('bcrypt');
const path = require('path');
const cloudinary = require("cloudinary").v2;
cloudinary.config(process.env.CLOUDINARY_URL);
const fs  = require("fs");
const pdf = require("pdf-creator-node");
const handlebars = require('handlebars');
const { Evento } = require("../models");
// const mongoose = require("mongoose");
const { generarJWT } = require("../helpers/jwt");
const multer = require('multer')
const Excel = require('exceljs');
const Axios = require('axios');

const loginClienteFree = async (req, res = response) => {
  const { id } = req.body;
  try {
    const cliente = await Cliente.findById(id);
    if (!cliente) {
      return res.status(400).json({
        ok: false,
        msg: "El codigo no existe",
      });
    }
    if(!cliente.ticket){
      return res.status(400).json({
        ok: false,
        msg: "El codigo ya ha sido utilizado",
      });
    }
    const token = await generarJWT(cliente.id, cliente.nombre);

    res.json({
      ok: true,
      uid: cliente.id,

      rol: cliente.rol,
      token
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Por favor hable con el administrador",
    });
  }
};
const subirArchivoSinToken = async(req,res)=>{
  const {dni,evento} = req.body;
  let dir = "./comprobantes/";
  const comprobar = fs.existsSync(path.join(dir,"comprobante-"+dni+".pdf"));
  if(!comprobar){
    return res.status(400).json({ status:"error",msg:"El PDF no esta guardado en el sistema"});
  }
  const pathToFile = path.join(dir,"comprobante-"+dni+".pdf");
  const { secure_url } = await cloudinary.uploader.upload(pathToFile);
  if(secure_url){
    const query = {dni,"entradas.evento":evento};
    const cliente = await Cliente.findOne(query);
    if(!cliente){
      return res.status(400).json({
        msg: `El cliente no existe en el sistema`,
      });
    }
    await Cliente.findOneAndUpdate(query,{ultComp:secure_url},{new:true});
    return res.status(200).json({ ok:true, msg:"El archivo se ha subido exitosamente",pdfurl:secure_url });
  }else{
    return res.status(400).json({ status:"error",msg:"Ha ocurrido un error"});
  }
}
const autoCargaFree = async (req, res) => {
  const {id,dni,nombre,apellido,celular,fecha,dataUrl} = req.body;
  const cliente = await Cliente.findById(id);
  if(cliente){
    const update = {dni,nombre,apellido,celular,fecha,ticket:false};
    const clienteUpdate = await Cliente.findOneAndUpdate({_id:id},update,{new:true});
    const clienteHtml = await Cliente.find({dni}).lean();
    var DateFormats = {
      fecha: "DD/MM/yyyy",
      hora: "HH:mm:ss"
    };
    handlebars.registerHelper("formatDate", function(datetime, format) {
      if (moment) {
        format = DateFormats[format] || format;
        return moment(datetime).format(format);
      }
      else {
        return datetime;
      }
    });
    handlebars.registerHelper("base64ImageSrc", function(string) {
      return new handlebars.SafeString(string);
    });
    const html = fs.readFileSync("./report/report.html", "utf8");
    const options = {
      format: "A4",
      orientation: "portrait",
      border: "10mm",
    };
    let logoUrl = fs.readFileSync('./images/e.png').toString('base64');
    logoUrl = "data:image/png;base64,"+logoUrl;
    const document = {
      html: html,
      data: {
        datos: clienteHtml,
        dataUrl,
        logoUrl,
      },
      path: "./comprobantes/comprobante-"+dni+".pdf",
      type: "",
    };
    pdf
    .create(document, options)
    .then((resultado) => {
      return res.status(200).json({ oki:false,ok: true, cliente: clienteUpdate  });
    })
    .catch((error) => {
      console.log(error)
      return res.status(400).json({ ok:false, msg: error });
    });
  }else{
    return res.status(400).json({
      msg: `El ticket ya ha sido utilizado`,
    });
  }
};
const autoActualizarFree = async (req, res) => {
  const {id,dni,celular,fecha,dataUrl} = req.body;
  const ticket = await Cliente.findById(id);
  const cliente = await Cliente.findOne({dni:dni});
  let update;
  let banderita = false;
  if(cliente){
    if(cliente.entradas.length!=0){
      cliente.entradas.forEach((value)=>{
        ticket.entradas.forEach((valor)=>{
          if(value.evento === valor.evento){
            banderita = true;
          }
        })
      });
    }
    if(banderita){
      return res.status(400).json({ ok:false, oki: false, msg:"El cliente ya se cargo en este evento"});
    }
    update = {dni,nombre:cliente.nombre,apellido:cliente.apellido,celular,fecha,ticket:false};
  }
  try {
    // if(cliente){
    // await Cliente.findOneAndUpdate({dni},{dni:cliente.dni+100000000,estado:false},{new:true});
    // }else{
    // await Cliente.findOneAndUpdate({dni},{dni:ticket.dni+100000000,estado:false},{new:true});
    // }
    await Cliente.findOneAndDelete({dni});
    let clienteUpdate;
    setTimeout(async()=>{ 
      clienteUpdate= await Cliente.findOneAndUpdate({_id:id},update,{new:true})
      const clienteHtml = await Cliente.find({dni}).lean();
      var DateFormats = {
        fecha: "DD/MM/yyyy",
        hora: "HH:mm:ss"
      };
      handlebars.registerHelper("formatDate", function(datetime, format) {
        if (moment) {
          format = DateFormats[format] || format;
          return moment(datetime).format(format);
        }
        else {
          return datetime;
        }
      });
      handlebars.registerHelper("base64ImageSrc", function(string) {
        return new handlebars.SafeString(string);
      });
      const html = fs.readFileSync("./report/report.html", "utf8");
      const options = {
        format: "A4",
        orientation: "portrait",
        border: "10mm",
      };
      let logoUrl = fs.readFileSync('./images/e.png').toString('base64');
      logoUrl = "data:image/png;base64,"+logoUrl;
      const document = {
        html: html,
        data: {
          datos: clienteHtml,
          dataUrl,
          logoUrl,
        },
        path: "./comprobantes/comprobante-"+dni+".pdf",
        type: "",
      };
      pdf
      .create(document, options)
      .then((resultado) => {
        return res.status(200).json({ oki:false,ok: true, cliente: clienteUpdate  });
      })
      .catch((error) => {
        console.log(error)
        return res.status(400).json({ ok:false, msg: error });
      });
    },2000);
    // return res.status(201).json({ ok:true, cliente: clienteUpdate  });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const getCliente = async (req, res) => {
  const {id,idevento} = req.params;
  const query = { estado: true,ticket:false, _id:id};
  if(id.length!=24){
    return res.status(500).json({
      status: "error",
      message: "El cliente no existe"
    });
  }
  const cliente = await Cliente.findOne(query);
  let url;
  if(!cliente){
    return res.status(500).json({
      status: "error",
      message: "El cliente no existe"
    });
  }else{
    for (let i = 0; i < cliente.entradas.length; i++) {
      if(cliente.entradas[i].evento===idevento){
        url = cliente.entradas[i].ultComp;
      }
    }
    return res.json({ cliente, url });
  }
};

const verificarClienteSinToken = async (req, res) => {
  const { dni } = req.params;
  if(dni !== "undefined"){
    const query = { estado: true, dni};
    const cliente = await Cliente.findOne(query);
    if(cliente){
      return res.status(200).json({status:"success",cliente});
    }else{
      return res.status(500).json({
        status: "error",
        message: "El cliente no existe"
      });
    }
  }else{
    return res.status(500).json({
      status: "error",
      message: "Error, reingrese el numero"
    });
  } 
}
const getClientesAll = async (req, res) => {
  const [total, clientes] = await Promise.all([
    Cliente.countDocuments(),
    Cliente.find()
      .populate("usuario").sort('apellido')
  ]);
  res.json({ total, clientes });
};
const getClientes = async (req, res) => {
  // const { limit = 5, from = 0 } = req.query;
  const query = { estado: true,ticket:false };

  const [total, clientes] = await Promise.all([
    Cliente.countDocuments(query),
    Cliente.find(query)
      .populate("usuario").sort('apellido')
      // .skip(Number(from))
      // .limit(Number(limit)),
  ]);
  res.json({ total, clientes });
};
const getClientesVerificados = async (req, res) => {
  const {idevento} = req.params;
  // const usuario = await Usuario.findOne({evento:idevento});
  const query = {estado: true,ticket:false, verificado:true,"entradas.evento":idevento};
  const [total, clientes] = await Promise.all([
    Cliente.countDocuments(query),
    Cliente.find(query)
      .populate("usuario").sort('apellido')
  ]);
  if(!clientes){
    return res.status(400).json({
      msg: `El evento no tiene clientes ingresados aun`,
    });
  }
  res.json({ total, clientes });
};
const getClientesBuscados = async (req, res) => {
  const {apellido,id} = req.params;
  const usuario = await Usuario.findOne({estado:true,_id:id});
  const queryus = { estado: true, "eventos.rrpp": id};
  const users = await Usuario.find(queryus);
  let totaltar;
  let clientestar;
  let clientesTarje = [];
  if(users){
    for(let i = 0;i<users.length;i++){
      const query2 = { estado: true,ticket:false,"apellido": { $regex: '.*' + apellido,$options:'i' + '.*' }, "usuarios.usuario":users[i]._id };
      [totaltar, clientestar] = await Promise.all([
        Cliente.countDocuments(query2),
        Cliente.find(query2).populate("usuario").sort('apellido')
      ]);
      for(let j = 0;j<clientestar.length;j++){
        clientesTarje.push(clientestar[j])
      }
    }
  }
  const query = {estado: true,ticket:false, "apellido": { $regex: '.*' + apellido,$options:'i' + '.*' }, "usuarios.usuario":id};
  let [total, clientes] = await Promise.all([
    Cliente.countDocuments(query),
    Cliente.find(query).populate("usuario").sort('apellido')
  ]);
  if(!clientes){
    return res.status(400).json({
      msg: `El evento no tiene clientes ingresados aun`,
    });
  }
  total = total+totaltar;
  let clientess = [];
  if(clientesTarje){
    for(let j = 0;j<clientesTarje.length;j++){
      clientess.push(clientesTarje[j]);
    }
  }
  for(let k = 0;k<clientes.length;k++){
    clientess.push(clientes[k]);
  }
  
  let ganClientes = 0;
  let ganComision = 0;
  for (let i = 0; i < usuario.eventos.length; i++) {
    for (let j = 0; j < clientes.length; j++) {
      for (let k = 0; k < clientes[j].entradas.length; k++) {
        if(clientes[j].entradas[k].evento===usuario.eventos[i].evento){
          ganClientes = ganClientes+usuario.eventos[i].comisionEnt;
        }
      }
    }
    for (let j = 0; j < clientesTarje.length; j++) {
      for (let k = 0; k < clientesTarje[j].entradas.length; k++) {
        if(clientesTarje[j].entradas[k].evento===usuario.eventos[i].evento){
          ganComision = ganComision+usuario.eventos[i].comisionRRPP;
        }
      }
    }
  }
  const ganTotal = ganComision+ganClientes;
  
  res.json({ total, clientess,gancomision:ganComision, gantotal:ganTotal, ganclientes:ganClientes });
};
const getClientesBuscadosTotal = async (req, res) => {
  const {apellido,evento} = req.params;
  let number = Number(apellido);
  let query;
  if(isNaN(number)){
    query = {estado: true,ticket:false, "apellido": { $regex: '.*' + apellido,$options:'i' + '.*' },"entradas.evento":evento};
  }else{
    query = {estado: true,ticket:false, "dni": number,"entradas.evento":evento};
  }
  // const query = {estado: true,ticket:false, "apellido": { $regex: '.*' + apellido,$options:'i' + '.*' },"entradas.evento":evento};
  let [total, clientess] = await Promise.all([
    Cliente.countDocuments(query),
    Cliente.find(query).populate("usuario").sort('apellido')
  ]);
  if(!clientess){
    return res.status(400).json({
      msg: `El evento no tiene clientes ingresados aun`,
    });
  }
  res.json({ total, clientess });
};
const getClientesBuscadosTotalAdmin = async (req, res) => {
  const {apellido} = req.params;
  let number = Number(apellido);
  let query;
  if(isNaN(number)){
    query = {estado: true,ticket:false, "apellido": { $regex: '.*' + apellido,$options:'i' + '.*' }};
  }else{
    query = {estado: true,ticket:false, "dni": number};
  }
  // const query = {estado: true,ticket:false, "apellido": { $regex: '.*' + apellido,$options:'i' + '.*' },"entradas.evento":evento};
  let [total, clientess] = await Promise.all([
    Cliente.countDocuments(query),
    Cliente.find(query).populate("usuario").sort('apellido')
  ]);
  if(!clientess){
    return res.status(400).json({
      msg: `El evento no tiene clientes ingresados aun`,
    });
  }
  res.json({ total, clientess });
};
const getClientesVeriBuscados = async (req, res) => {
  const {apellido,evento} = req.params;
  let number = Number(apellido);
  let query;
  if(isNaN(number)){
    query = {estado: true,ticket:false,verificado:true, "apellido": { $regex: '.*' + apellido,$options:'i' + '.*' },"entradas.evento":evento};
  }else{
    query = {estado: true,ticket:false,verificado:true, "dni": number,"entradas.evento":evento};
  }
  // const query = {estado: true,ticket:false,verificado:true, "apellido": { $regex: '.*' + apellido,$options:'i' + '.*' },"entradas.evento":evento};
  let [total, clientess] = await Promise.all([
    Cliente.countDocuments(query),
    Cliente.find(query).populate("usuario").sort('apellido')
  ]);
  if(!clientess){
    return res.status(400).json({
      msg: `El evento no tiene clientes ingresados aun`,
    });
  }
  res.json({ total, clientess });
};
const getClientesPorTarjeteroBuscados = async (req, res) => {
  const {apellido,id} = req.params;
  const usuario = await Usuario.findOne({estado:true,_id:id});
  const queryus = { estado: true, "eventos.rrpp": id, "apellido": { $regex: '.*' + apellido,$options:'i' + '.*' }};
  const users = await Usuario.find(queryus);
  let totaltar;
  let clientestar;
  let clientesTarje = [];
  if(users){
    for(let i = 0;i<users.length;i++){
      const query2 = { estado: true,ticket:false,"usuarios.usuario":users[i]._id , "usuarios.apellido": { $regex: '.*' + apellido,$options:'i' + '.*' }};
      [totaltar, clientestar] = await Promise.all([
        Cliente.countDocuments(query2),
        Cliente.find(query2).populate("usuario").sort('apellido')
      ]);
      for(let j = 0;j<clientestar.length;j++){
        clientesTarje.push(clientestar[j])
      }
    }
  }
  const query = {estado: true, "usuarios.usuario":id, "usuarios.apellido": { $regex: '.*' + apellido,$options:'i' + '.*' }};
  let [total, clientes] = await Promise.all([
    Cliente.countDocuments(query),
    Cliente.find(query).populate("usuario")
  ]);
  if(!clientes){
    return res.status(400).json({
      msg: `El evento no tiene clientes ingresados aun`,
    });
  }
    let clientess = [];
    if(clientesTarje){
      for(let j = 0;j<clientesTarje.length;j++){
        clientess.push(clientesTarje[j]);
      }
    }
    for(let k = 0;k<clientes.length;k++){
      clientess.push(clientes[k]);
    }
    let ganClientes = 0;
    let ganComision = 0;
    for (let i = 0; i < usuario.eventos.length; i++) {
      for (let j = 0; j < clientes.length; j++) {
        for (let k = 0; k < clientes[j].entradas.length; k++) {
          if(clientes[j].entradas[k].evento===usuario.eventos[i].evento){
            ganClientes = ganClientes+usuario.eventos[i].comisionEnt;
          }
        }
      }
      for (let j = 0; j < clientesTarje.length; j++) {
        for (let k = 0; k < clientesTarje[j].entradas.length; k++) {
          if(clientesTarje[j].entradas[k].evento===usuario.eventos[i].evento){
            ganComision = ganComision+usuario.eventos[i].comisionRRPP;
          }
        }
      }
    }
  const ganTotal = ganComision+ganClientes;
  res.json({ totaltar, clientess,gancomision:ganComision, gantotal:ganTotal, ganclientes:ganClientes });
};
const getClienteByRpp = async (req, res) => {
  const { uid } = req.params;
  const query = { estado: true,ticket:false, "usuarios.usuario": uid };
  const queryDB = { estado: true, _id: uid };
  let eventoid;
  const userDb = await Usuario.findOne(queryDB);
  for (let i = 0; i < userDb.eventos.length; i++) {
    if(userDb.eventos[i].rolEvento==="RRPP"){
      eventoid = userDb.eventos[i].evento;
    }
  }
  const queryus = { estado: true, "eventos.rrpp": uid};
  const users = await Usuario.find(queryus);
  let totaltar;
  let clientestar;
  let clientesTarje = [];
  if(users){
    for(let i = 0;i<users.length;i++){
      let query2;
      if(eventoid!==undefined){
        query2 = { estado: true, "usuarios.usuario":users[i]._id, "entradas.evento":eventoid};
      }else{
        query2 = { estado: true, "usuarios.usuario":users[i]._id};
      }
      
      [totaltar, clientestar] = await Promise.all([
        Cliente.countDocuments(query2),
        Cliente.find(query2).populate("usuario").sort([['fecha'],['apellido'], ['nombre']])
      ]);
      
      for(let j = 0;j<clientestar.length;j++){
        clientesTarje.push(clientestar[j])
      }
    }
  }
  
  try {
    let [total, clientes] = await Promise.all([
      Cliente.countDocuments(query),
      Cliente.find(query).populate("usuario").sort([['fecha'],['apellido'], ['nombre']])
    ]);
    //const clientes = await Cliente..populate("usuario", "nombre");
    if (!clientes) {
      return res.status(400).json({
        msg: `El usuario no tiene clientes inscriptos`,
      });
    }
    total = total+totaltar;
    let clientess = [];
    if(clientesTarje){
      for(let j = 0;j<clientesTarje.length;j++){
        clientess.push(clientesTarje[j]);
      }
    }

    for( var i=clientess.length - 1; i>=0; i--){
      for( var j=0; j<clientes.length; j++){
          if(clientess[i] && (clientess[i].dni === clientes[j].dni)){
            clientess.splice(i, 1);
          }
      }
    };
    for (let c = 0; c < clientes.length; c++) {
      clientess.push(clientes[c]);
    }
    
    return res.status(201).json({ total, clientess});
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const getClientesFreeByRRPP = async (req, res) => {
  const { id } = req.params;
  try {
    const usuario = await Usuario.findOne({_id:id});   
    let total = 0;
    for(let i = 0;i<usuario.eventos.length;i++){
      total = usuario.eventos[i].cantFreeCargados;
    } 
    return res.status(201).json({ total });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const getClientesFreeByEvento = async (req, res) => {
  const { idevento } = req.params;
  const query = { estado: true, ticket:false, free:true , "entradas.evento": idevento };
  try {
    const [total,clientes] = await Promise.all([
      Cliente.countDocuments(query),
      Cliente.find(query).populate("usuario").sort('apellido')
    ]);
    return res.status(201).json({ total,clientes });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const getTicketsFreeByEvento = async (req, res) => {
  const { idevento } = req.params;
  const query = {estado:true, esticket:true , free:true , "entradas.evento": idevento };
  try {
    const [total,clientes] = await Promise.all([
      Cliente.countDocuments(query),
      Cliente.find(query).populate("usuario").sort('apellido')
    ]);
    return res.status(201).json({ total,clientes });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const getClienteEdit = async (req, res) => {
  const { id } = req.params;
  const query = { estado: true, _id: id };
  try {
    const cliente = await Cliente.findOne(query);
    //const clientes = await Cliente..populate("usuario", "nombre");
    if (!cliente) {
      return res.status(400).json({
        msg: `El cliente no existe`,
      });
    }
    return res.status(201).json({ cliente });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const reenviarWSP = async (req, res) => {
  const { id,idevento } = req.params;
  try {
    const cliente = await Cliente.findById(id);
    if(!cliente){
      return res.status(400).json({
        ok: false,
        msg: "El usuario no existe",
      });
    }
    let url;
    for (let i = 0; i < cliente.entradas.length; i++) {
      if(cliente.entradas[i].evento===idevento){
        url=cliente.entradas[i].ultComp;
      }
    }
    return res.status(201).json({ ok:true,celular:cliente.celular, url,id:cliente._id });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const getClientesByEvento = async (req, res) => {
  const { idevento } = req.params;
  // const queryRRPP = {estado:true, "eventos.evento":idevento,"rol":"RRPP"};
  try {
    const queryCliGen = { estado: true, ticket:false, "entradas.evento": idevento};
    let [totalCantClientes, totalClientes] = await Promise.all([
            Cliente.countDocuments(queryCliGen),
            Cliente.find(queryCliGen).populate("usuario").sort([['fecha'],['apellido'], ['nombre']])
    ]);
    // let totalCantClientes = 0;
    // let totalClientes = [];
    // const rrpps = await Usuario.find(queryRRPP);
    // for (let i = 0; i < rrpps.length; i++) {
    //   const queryCliGen = { estado: true,ticket:false, "entradas.evento": idevento, usuario:rrpps[i]._id};
    //     let [totalGen, clientesGen] = await Promise.all([
    //       Cliente.countDocuments(queryCliGen),
    //       Cliente.find(queryCliGen).populate("usuario").sort([['usuario'], ['apellido']])
    //     ]);
    //     totalCantClientes = totalCantClientes +totalGen;
    //     for (let u = 0; u < clientesGen.length; u++) {
    //       totalClientes.push(clientesGen[u]);
    //     }
    //   const queryTAR = { estado: true, "eventos.evento": idevento, "rrpp":rrpps[i]._id,"rol":"TARJETERO"};
    //   const rrpptar = await Usuario.find(queryTAR);
    //   for (let j = 0; j < rrpptar.length; j++) {
    //     const queryCli = { estado: true,ticket:false, "entradas.evento": idevento, usuario:rrpptar[j]._id};
    //     let [total, clientes] = await Promise.all([
    //       Cliente.countDocuments(queryCli),
    //       Cliente.find(queryCli).populate("usuario").sort([['usuario'], ['apellido']])
    //     ]);
    //     totalCantClientes = totalCantClientes +total;
    //     for (let k = 0; k < clientes.length; k++) {
    //       totalClientes.push(clientes[k]);
    //     }
    //   }
    // }
    return res.status(201).json({ total:totalCantClientes, clientes:totalClientes });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const getClientesByEventoAndRRPP = async (req, res) => {
  const { idevento, id } = req.params;
  const querytest = {estado:true,ticket:false,"usuarios": {
    "$elemMatch": {
        "usuario": id,
        "evento": idevento
    }, 
},"entradas": {
  "$elemMatch": {
      "usuario": id,
      "evento": idevento
  }, 
}
};
  // const query = { estado: true,ticket:false,"usuarios.usuario":id , "entradas.evento": idevento };
  try {
    const [total, clientes] = await Promise.all([
      Cliente.countDocuments(querytest),
      Cliente.find(querytest).sort([['fecha'],['apellido'], ['nombre']])
    ]);
    if (!clientes) {
      return res.status(400).json({
        msg: `El evento no tiene clientes inscriptos`,
      });
    }
    return res.status(201).json({ total, clientes });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const resetearIngresos = async (req, res) => {
  const query = { estado: true, verificado:true };
  const update = { verificado:false};
  try {
    await Cliente.updateMany(query,update);
    return res.status(201).json({ ok:true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const pasarPagoAFree = async (req, res) => {
  await Evento.findOneAndUpdate({_id:"622651bc4e186f00160f417c"},{clientesPuerta:0})
  const clientesDb = await Cliente.find({free:false,estado:true});
  try {
    for(let i = 0;i<clientesDb.length;i++){
      let clienteDb = await Cliente.findById({_id:clientesDb[i]._id});
      const entradasF = [{tipo:"Free",
        evento:"622651bc4e186f00160f417c",
        importe: 0,
        usuario:clienteDb.usuario,
        nombre:"Oporto"}];
      // const entradasF = [];
      clienteDb.entradas = entradasF;
      clienteDb.free = true;
      clienteDb.tipo = "Free";
      const query = { estado: true, _id:clientesDb[i]._id};
      await Cliente.replaceOne(query, clienteDb);
    }
    return res.status(201).json({ ok:true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const resetearFREE= async (req, res) => {
  const { uid } = req.body;
  const clientesDb = await Cliente.find({free:true,estado:true});
  try {
    for(let i = 0;i<clientesDb.length;i++){
      let clienteDb = await Cliente.findById({_id:clientesDb[i]._id});
      const entradasF = [];
      clienteDb.entradas = entradasF;
      const usuariosF = [];
      clienteDb.usuarios = usuariosF;
      clienteDb.usuario = uid;
      const query = { estado: true, _id:clientesDb[i]._id};
      await Cliente.replaceOne(query, clienteDb);
    }
    return res.status(201).json({ ok:true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const resetearTODO= async (req, res) => {
  const { uid } = req.body;
  const clientesDb = await Cliente.find({estado:true});
  try {
    for(let i = 0;i<clientesDb.length;i++){
      let clienteDb = await Cliente.findById({_id:clientesDb[i]._id});
      const entradasF = [];
      clienteDb.entradas = entradasF;
      const usuariosF = [];
      clienteDb.usuarios = usuariosF;
      clienteDb.usuario = uid;
      const query = { estado: true, _id:clientesDb[i]._id};
      await Cliente.replaceOne(query, clienteDb);
    }
    return res.status(201).json({ ok:true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const sacarTodos= async (req, res) => {
  const { uid,idevento } = req.body;
  const clientesDb = await Cliente.find({estado:true,"entradas.evento":idevento});
  const rrppsDb = await Usuario.find({estado:true,"eventos.evento":idevento});
  try {
    for(let i = 0;i<clientesDb.length;i++){
      let clienteDb = await Cliente.findById({_id:clientesDb[i]._id});
      const entradasF = [];
      clienteDb.entradas = entradasF;
      const usuariosF = [];
      clienteDb.usuarios = usuariosF;
      clienteDb.usuario = uid;
      const query = { estado: true, _id:clientesDb[i]._id};
      await Cliente.replaceOne(query, clienteDb);
    }
    for(let i = 0;i<rrppsDb.length;i++){
      let rrppDb = await Usuario.findById({_id:rrppsDb[i]._id});
      for (let j = 0; j < rrppDb.eventos.length; j++) {
        if(rrppDb.eventos[j].evento===idevento){
          rrppDb.eventos[j].deuda=0;
          rrppDb.eventos[j].totalEntradas = 0;
        }
      }
      const query = { estado: true, _id:rrppsDb[i]._id};
      await Usuario.replaceOne(query, rrppDb);
    }
    return res.status(201).json({ ok:true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const verificarClienteByDniSinUpdate = async (req, res) => {
  const { dni, idevento, fecha } = req.params;
  let dnii = Number(dni);
  // console.log(typeof dnii);
  // console.log(dnii);
  // console.log(fecha);
  let dia = fecha.substring(0,2);
  let mes = fecha.substring(3,5);
  let anio = fecha.substring(6,10);
  let fechaCompleta = mes+"/"+dia+"/"+anio;
  if(isNaN(dnii)){
    return res.status(400).json({
      msg: `Error el DNI pasado no es un numero valido, ingrese manualmente o comunique al administrador`,
    });
  }
  const cliente = await Cliente.findOne({dni:dni});
  if(cliente){
    if(cliente.verificado){
      return res.status(400).json({
          msg: `El cliente ya ingreso al evento`,
      });
    }else{
        const query = { estado: true, dni: dni, "entradas.evento": idevento};
        try {
          const cliente = await Cliente.findOne(query).populate("usuario", "nombre");
          if (!cliente) {
            return res.status(400).json({
              msg: `El cliente no existe en este evento`,
            });
          }
          //EDAD
          let hoy = new Date()
          let fechaNacimiento = new Date(fechaCompleta)
          let edad = hoy.getFullYear() - fechaNacimiento.getFullYear()
          let diferenciaMeses = hoy.getMonth() - fechaNacimiento.getMonth()
          if (
            diferenciaMeses < 0 ||
            (diferenciaMeses === 0 && hoy.getDate() < fechaNacimiento.getDate())
          ) {
            edad--
          }
          let mesInt = Number(mes);
          if(edad <=17 && mesInt >7){
            return res.status(400).json({
              msg: `El cliente es menor de edad`,
            });
          }
          return res.status(201).json({ok:true, cliente,edad });
        } catch (error) {
          console.log(error);
          return res.status(500).json({
            ok: false,
            msg: "Hable con el administrador",
          });
        }
    }
  }else{
    return res.status(400).json({
      msg: `El cliente no existe en el sistema`,
    });
  }
};
const verificarClienteByDni = async (req, res) => {
  const { dni, idevento } = req.params;
  let dnii = Number(dni);
  if(isNaN(dnii)){
    return res.status(400).json({
      msg: `Error el DNI pasado no es un numero valido, ingrese manualmente o comunique al administrador`,
    });
  }
  const cliente = await Cliente.findOne({dni:dni});
  if(cliente){
    if(cliente.verificado){
      return res.status(400).json({
          msg: `El cliente ya ingreso al evento`,
      });
    }else{
      let bandera = false;
      for(let i = 0; i<cliente.entradas.length;i++){
        if(cliente.entradas[i].evento===idevento){
          bandera = true;
        }
      }
      if(bandera){
        // let time = moment();
        // let beforeTime = moment('00:30:00', 'hh:mm:ss');
        // let afterTime = moment('02:15:00', 'hh:mm:ss');
        // if(cliente.free && cliente.esticket && !time.isBetween(beforeTime,afterTime)){
        //   return res.status(400).json({
        //     msg: `El horario de entrada para clientes FREE ha finalizado`,
        //   });
        // }
        const query = { estado: true, dni: dni, "entradas.evento": idevento};
        const update = {verificado: true, entrada : moment().format()};
        try {
          const cliente = await Cliente.findOneAndUpdate(query,update,{new:true}).populate("usuario", "nombre");
          if (!cliente) {
            return res.status(400).json({
              msg: `El cliente no existe en este evento`,
            });
          }
          return res.status(201).json({ok:true, cliente });
        } catch (error) {
          console.log(error);
          return res.status(500).json({
            ok: false,
            msg: "Hable con el administrador",
          });
        }
      }else{
        const query = { estado: true, dni: dni, "entradas.evento": idevento};
        const clienteDb = await Cliente.findOne(query);
          if(!clienteDb){
            return res.status(400).json({
              msg: `El cliente no existe en el sistema`,
            });
          }
      }
    }
  }else{
    return res.status(400).json({
      msg: `El cliente no existe en el sistema`,
    });
  }
};
const setHash = async(req,res)=>{
  const { uid,dni,celular } = req.body;
  const armado = uid+"-"+dni+"-"+celular;
  const hash = bcrypt.hashSync(armado,10);
  res.json({hash});
}
const setHashSinToken = async(req,res)=>{
  const { uid,dni,celular } = req.body;
  const armado = uid+"-"+dni+"-"+celular;
  const hash = bcrypt.hashSync(armado,10);
  res.json({hash});
}
const verificarHash = async (req, res) => {
  let { hash, idevento } = req.params;
  let hashh = hash.replace(/-/g,'/');
  let hashs = hashh.replace(/@/g,'$');
  let dni = hashs.substr(0, 8);
  let celular = hashs.substr(8, 10);
  let hasheo = hashs.substr(18);
  const cliente = await Cliente.findOne({estado:true,dni:dni,"entradas.evento":idevento});
  let hashArmado = "";
  if(cliente){
    if(cliente.verificado){
      return res.status(400).json({
        msg: `El cliente ya ingreso al evento`,
      });
    }
    for(let i=0;i<cliente.entradas.length;i++){
      if(cliente.entradas[i].evento === idevento){
        hashArmado = cliente.entradas[i].usuario+"-"+dni+"-"+celular;
      }
    };
    const verify = bcrypt.compareSync(hashArmado,hasheo);
    if(verify){
      const query = { estado: true, dni: dni, "entradas.evento": idevento};
      const update = {verificado: true, entrada : moment().format()};
      try {
        const clientenuevo = await Cliente.findOneAndUpdate(query,update,{new:true}).populate("usuario");
        return res.status(200).json({cliente:clientenuevo,
          msg: `El QR es correcto`,
        });
      } catch (error) {
        console.log(error);
        return res.status(500).json({
          ok: false,
          msg: "Hable con el administrador",
        });
      }
    }else{
        return res.status(400).json({
          msg: `El QR NO es correcto`,
        });
    }
  }else{
    return res.status(400).json({
      msg: `El cliente no existe en el sistema`,
    });
  }
  
};
const verificarCliente = async (req, res) => {
  const { dni } = req.params;
  if(dni !== "undefined"){
    const query = { estado: true, dni};
    const cliente = await Cliente.findOne(query);
    if(cliente){
      return res.status(200).json({status:"success",cliente});
    }else{
      return res.status(500).json({
        status: "error",
        message: "El cliente no existe"
      });
    }
  }else{
    return res.status(500).json({
      status: "error",
      message: "Error, reingrese el numero"
    });
  } 
};
const crearCliente = async (req, res) => {
  const {dni,usuario,dataUrl,evento,tipo,eventoid} = req.body;

  const eventoDb = await Evento.findOne({_id:eventoid});
  if(eventoDb){
    if(eventoDb.finalizado){
      return res.status(400).json({ ok:false, oki: false, msg:"Este evento esta cerrado, no se puede agregar ni actualizar ningun dato"});
    }
  }

  const cliente = await Cliente.findOne({dni});
  let bandera = false;
  let banderita = false;
  if(cliente){
    if(cliente.usuarios.length!=0){
      cliente.usuarios.forEach((value)=>{
        if(value.usuario !== usuario){
          bandera=true;
        }
      });
    }
    if(cliente.entradas.length!=0){
      cliente.entradas.forEach((value)=>{
        if(value.evento === eventoid){
          banderita = true;
        }
      });
    }
  }
  if(banderita){
    return res.status(400).json({ ok:false, oki: false, msg:"El cliente ya se cargo en este evento"});
  }
  const usuarioDb = await Usuario.findById(usuario);
  let rol;
  let usuarioRRPP = "";
  for (let h = 0; h < usuarioDb.eventos.length; h++) {
    if(usuarioDb.eventos[h].evento===eventoid){
      rol = usuarioDb.eventos[h].rolEvento;
      if(usuarioDb.eventos[h].rolEvento === "TARJETERO" || usuarioDb.eventos[h].rolEvento === "ESPECIAL"){
        usuarioRRPP = usuarioDb.eventos[h].rrpp;
      }
    }
  }
  
  // if(bandera){
    
  //   const clienteUpdate = await Cliente.findOneAndUpdate({dni},{$push:{usuarios:{usuario,evento:eventoid,nombre:usuarioDb.nombre,apellido:usuarioDb.apellido}},evento,tipo},{new:true});
  //   // await Cliente.findOneAndUpdate({dni},{evento,tipo},{new:true});
  //   return res.status(201).json({ ok:false, oki: true, cliente: clienteUpdate });
  // }else{
  try {
    const rrppDb = await Usuario.findById(usuario);
      // for(let i = 0;i<rrppDb.eventos.length;i++){
      //   if(rrppDb.eventos[i].evento==eventoid){
      //     if(rrppDb.eventos[i].cantFreeCargados>=rrppDb.eventos[i].maxFree){
      //       return res.status(400).json({ ok:false, oki: false, msg:"Has llegado al máximo de clientes"});
      //     }
      //   }
      // }
    const clienteNuevo = new Cliente(req.body);
    await clienteNuevo.save();
    // const clienteup = await Cliente.findOneAndUpdate({dni:dni},{$push:{usuarios:{usuario}}},{new:true});
    await Cliente.findOneAndUpdate({dni:dni},{$push:{usuarios:{usuario,evento:eventoid,nombre:usuarioDb.nombre,apellido:usuarioDb.apellido,rol,usuarioRRPP}},evento,tipo},{new:true});
    // await Cliente.findOneAndUpdate({dni},{evento,tipo},{new:true});
    for(let i = 0;i<rrppDb.eventos.length;i++){
      if(rrppDb.eventos[i].evento==eventoid){
        if(rrppDb.eventos[i].rolEvento==="TARJETERO" || rrppDb.eventos[i].rolEvento==="ESPECIAL"){
          const rrppGenDb = await Usuario.findById(rrppDb.eventos[i].rrpp);
          for (let y = 0; y < rrppGenDb.eventos.length; y++) {
            if(rrppGenDb.eventos[y].evento==eventoid){
              rrppGenDb.eventos[y].deudaComision = rrppGenDb.eventos[y].deudaComision+rrppGenDb.eventos[y].comisionRRPP;
              break;
            }
          }
          await Usuario.replaceOne({estado: true, _id: rrppDb.eventos[i].rrpp},rrppGenDb);
        }
        rrppDb.eventos[i].deuda = rrppDb.eventos[i].deuda+rrppDb.eventos[i].comisionEnt;
        rrppDb.eventos[i].cantFreeCargados = rrppDb.eventos[i].cantFreeCargados+1;
        break;
      }
    }
    await Usuario.replaceOne({estado: true, _id: usuario},rrppDb);

    const clienteHtml = await Cliente.find({dni}).lean();
    var DateFormats = {
      fecha: "DD/MM/yyyy",
      hora: "HH:mm:ss"
    };
    handlebars.registerHelper("formatDate", function(datetime, format) {
      if (moment) {
        format = DateFormats[format] || format;
        return moment(datetime).format(format);
      }
      else {
        return datetime;
      }
    });
    handlebars.registerHelper("base64ImageSrc", function(string) {
      return new handlebars.SafeString(string);
    });
    const html = fs.readFileSync("./report/report.html", "utf8");
    const options = {
      format: "A4",
      orientation: "portrait",
      border: "10mm",
    };
    let logoUrl = fs.readFileSync('./images/e.png').toString('base64');
    logoUrl = "data:image/png;base64,"+logoUrl;
    const document = {
      html: html,
      data: {
        datos: clienteHtml,
        dataUrl,
        logoUrl,
      },
      path: "./comprobantes/comprobante-"+dni+".pdf",
      type: "",
    };
    pdf
    .create(document, options)
    .then((resultado) => {
      return res.status(200).json({ oki:false,ok: true, cliente: clienteNuevo  });
    })
    .catch((error) => {
      console.log(error)
      return res.status(400).json({ ok:false, msg: error });
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "El cliente ya existe",
    });
  }
  // }
  
};
const crearClienteMasivo = async (req, res) => {
  const {url,usuario,evento,tipo,eventoid} = req.body;
  let clientes = [];
  const eventoDb = await Evento.findOne({_id:eventoid});
  if(eventoDb){
    if(eventoDb.finalizado){
      return res.status(400).json({ ok:false, oki: false, msg:"Este evento esta cerrado, no se puede agregar ni actualizar ningun dato"});
    }
  }
  let wb = new Excel.Workbook();
  // let filePath = path.resolve(__dirname,'comprobantes','Clientes.xlsx');
  //FETCHEANDO CON AXIOS EL EXCEL FILE QUE ESTA EN CLOUDINARY, PASANDOLO COMO BUFFER
  if(url===""||url===undefined||url===null){
    return res.status(400).json({ ok:false, oki: false, msg:"No hay planilla de excel subida"});
  }
  let axiosRes = await Axios({
    url,
    responseType:"arraybuffer"
  })
  const fecha = moment.now();
  //LEYENDO CON EXCELJS.LOAD EL BUFFER
  wb.xlsx.load(axiosRes.data).then(function(){
    var sh = wb.getWorksheet(1);
    // const cantClientes = sh.rowCount;
    //Get all the rows data [1st and 2nd column]
    for (let i = 2; i <= sh.actualRowCount; i++) {
      //CELL 1 = DNI///// CELL 2 = NOMBRE///// CELL 3 = APELLIDO
      if(sh.getRow(i).getCell(1).value!=null && sh.getRow(i).getCell(2).value!= null && sh.getRow(i).getCell(3).value !=null){
        let dni = sh.getRow(i).getCell(1).value;
        let nombre = sh.getRow(i).getCell(2).value.toUpperCase();
        let apellido = sh.getRow(i).getCell(3).value.toUpperCase();
        const crearCliente = async (dni,nombre,apellido) => {
            const cliente = await Cliente.findOne({dni});
            let bandera = false;
            let banderita = false;
            if(cliente){
              // if(cliente.usuarios.length!=0){
              //   cliente.usuarios.forEach((value)=>{
              //     if(value.usuario !== usuario){
              //       bandera=true;
              //     }
              //   });
              // }
              if(cliente.entradas.length!=0){
                cliente.entradas.forEach((value)=>{
                  if(value.evento === eventoid){
                    banderita = true;
                  }
                });
              }
              bandera=true;
            }
            if(banderita){
              return res.status(400).json({ ok:false, oki: false, msg:"El cliente ya se cargo en este evento"});
            }
            // BANDERA TRUE = ACTUALIZAR, FALSE = CREAR
            if(bandera){
              const usuarioDb = await Usuario.findById(usuario);
              let rol;
              let usuarioRRPP = "";
              for (let h = 0; h < usuarioDb.eventos.length; h++) {
                if(usuarioDb.eventos[h].evento===eventoid){
                  rol = usuarioDb.eventos[h].rolEvento;
                  if(usuarioDb.eventos[h].rolEvento === "TARJETERO" || usuarioDb.eventos[h].rolEvento === "ESPECIAL"){
                    usuarioRRPP = usuarioDb.eventos[h].rrpp;
                  }
                }
              }
              const update = {$push:{usuarios:{usuario,evento:eventoid,nombre:usuarioDb.nombre,apellido:usuarioDb.apellido,rol,usuarioRRPP}},celular:cliente.celular,fecha,usuario,free:false,esticket:false,ticket:false,evento,tipo};
              const rrppDb = await Usuario.findById(usuario);
              const clienteUpdate= await Cliente.findOneAndUpdate({dni},update,{new:true});
              // const clienteNuevo = new Cliente({dni,nombre,apellido,celular:0,fecha,estado:true,usuario,evento,tipo,free:false,ticket:false,eventoid});
              // await clienteNuevo.save();
              // const clienteup = await Cliente.findOneAndUpdate({dni:dni},{$push:{usuarios:{usuario}}},{new:true});
              // const clienteeNuevo = await Cliente.findOneAndUpdate({dni},{$push:{usuarios:{usuario,evento:eventoid,nombre:usuarioDb.nombre,apellido:usuarioDb.apellido,rol,usuarioRRPP}},evento,tipo},{new:true});
              // await Cliente.findOneAndUpdate({dni},{evento,tipo},{new:true});
              for(let i = 0;i<rrppDb.eventos.length;i++){
                if(rrppDb.eventos[i].evento==eventoid){
                  if(rrppDb.eventos[i].rolEvento==="TARJETERO" || rrppDb.eventos[i].rolEvento==="ESPECIAL"){
                    const rrppGenDb = await Usuario.findById(rrppDb.eventos[i].rrpp);
                    for (let y = 0; y < rrppGenDb.eventos.length; y++) {
                      if(rrppGenDb.eventos[y].evento==eventoid){
                        rrppGenDb.eventos[y].deudaComision = rrppGenDb.eventos[y].deudaComision+rrppGenDb.eventos[y].comisionRRPP;
                        break;
                      }
                    }
                    await Usuario.replaceOne({estado: true, _id: rrppDb.eventos[i].rrpp},rrppGenDb);
                  }
                  rrppDb.eventos[i].deuda = rrppDb.eventos[i].deuda+rrppDb.eventos[i].comisionEnt;
                  rrppDb.eventos[i].cantFreeCargados = rrppDb.eventos[i].cantFreeCargados+1;
                  break;
                }
              }
              await Usuario.replaceOne({estado: true, _id: usuario},rrppDb);
              clientes.push(clienteUpdate)
            }else{
              const usuarioDb = await Usuario.findById(usuario);
              let rol;
              let usuarioRRPP = "";
              for (let h = 0; h < usuarioDb.eventos.length; h++) {
                if(usuarioDb.eventos[h].evento===eventoid){
                  rol = usuarioDb.eventos[h].rolEvento;
                  if(usuarioDb.eventos[h].rolEvento === "TARJETERO" || usuarioDb.eventos[h].rolEvento === "ESPECIAL"){
                    usuarioRRPP = usuarioDb.eventos[h].rrpp;
                  }
                }
              }
              const rrppDb = await Usuario.findById(usuario);
              const clienteNuevo = new Cliente({dni,nombre,apellido,celular:0,fecha,estado:true,usuario,evento,tipo,free:false,ticket:false,eventoid});
              await clienteNuevo.save();
              // const clienteup = await Cliente.findOneAndUpdate({dni:dni},{$push:{usuarios:{usuario}}},{new:true});
              const clienteeNuevo = await Cliente.findOneAndUpdate({dni},{$push:{usuarios:{usuario,evento:eventoid,nombre:usuarioDb.nombre,apellido:usuarioDb.apellido,rol,usuarioRRPP}},evento,tipo},{new:true});
              // await Cliente.findOneAndUpdate({dni},{evento,tipo},{new:true});
              for(let i = 0;i<rrppDb.eventos.length;i++){
                if(rrppDb.eventos[i].evento==eventoid){
                  if(rrppDb.eventos[i].rolEvento==="TARJETERO" || rrppDb.eventos[i].rolEvento==="ESPECIAL"){
                    const rrppGenDb = await Usuario.findById(rrppDb.eventos[i].rrpp);
                    for (let y = 0; y < rrppGenDb.eventos.length; y++) {
                      if(rrppGenDb.eventos[y].evento==eventoid){
                        rrppGenDb.eventos[y].deudaComision = rrppGenDb.eventos[y].deudaComision+rrppGenDb.eventos[y].comisionRRPP;
                        break;
                      }
                    }
                    await Usuario.replaceOne({estado: true, _id: rrppDb.eventos[i].rrpp},rrppGenDb);
                  }
                  rrppDb.eventos[i].deuda = rrppDb.eventos[i].deuda+rrppDb.eventos[i].comisionEnt;
                  rrppDb.eventos[i].cantFreeCargados = rrppDb.eventos[i].cantFreeCargados+1;
                  break;
                }
              }
              await Usuario.replaceOne({estado: true, _id: usuario},rrppDb);
              clientes.push(clienteeNuevo)
            }
            if(i==sh.actualRowCount){
              return res.status(200).json({ ok: true, clientes });
            }
        }
        crearCliente(dni,nombre,apellido);
      }else{
        return res.status(400).json({ ok:false, oki: false, msg:"La planilla tiene espacio, celdas o columnas vacias/en blanco"});
      }
      
    }  
  });
};
const crearClienteFree = async (req, res) => {
  const {dni,usuario,dataUrl,evento,tipo,eventoid} = req.body;

  const eventoDb = await Evento.findOne({_id:eventoid});
  if(eventoDb){
    if(eventoDb.finalizado){
      return res.status(400).json({ ok:false, oki: false, msg:"Este evento esta cerrado, no se puede agregar ni actualizar ningun dato"});
    }
  }

  const cliente = await Cliente.findOne({dni});
  let bandera = false;
  let banderita = false;
  if(cliente){
    if(cliente.usuarios.length!=0){
      cliente.usuarios.forEach((value)=>{
        if(value.usuario !== usuario){
          bandera=true;
        }
      });
    }
    if(cliente.entradas.length!=0){
      cliente.entradas.forEach((value)=>{
        if(value.evento === eventoid){
          banderita = true;
        }
      });
    }
  }
  if(banderita){
    return res.status(400).json({ ok:false, oki: false, msg:"El cliente ya se cargo en este evento"});
  }
  const usuarioDb = await Usuario.findById(usuario);
  let rol;
  let usuarioRRPP = "";
  for (let h = 0; h < usuarioDb.eventos.length; h++) {
    if(usuarioDb.eventos[h].evento===eventoid){
      rol = usuarioDb.eventos[h].rolEvento;
      if(usuarioDb.eventos[h].rolEvento === "TARJETERO" || usuarioDb.eventos[h].rolEvento === "ESPECIAL"){
        usuarioRRPP = usuarioDb.eventos[h].rrpp;
      }
    }
  }
  // if(bandera){
  //   const clienteUpdate = await Cliente.findOneAndUpdate({dni},{$push:{usuarios:{usuario,evento:eventoid,}}},{new:true});
  //   await Cliente.findOneAndUpdate({dni},{evento,tipo},{new:true});
  //   return res.status(201).json({ ok:false, oki: true, cliente: clienteUpdate });
  // }else{
  try {
    const clienteNuevo = new Cliente(req.body);
    await clienteNuevo.save();
    //ACUMULANDO FREE
    const RRPPDb = await Usuario.findById(usuario);
        for(let i = 0;i<RRPPDb.eventos.length;i++){
          if(RRPPDb.eventos[i].evento===eventoid){
            RRPPDb.eventos[i].cantFreeCargados += 1;
            break;
          }
        }
    const query = { estado: true, _id:usuario};
    await Usuario.replaceOne(query,RRPPDb);
    // const clienteup = await Cliente.findOneAndUpdate({dni:dni},{$push:{usuarios:{usuario}}},{new:true});
    await Cliente.findOneAndUpdate({dni:dni},{$push:{usuarios:{usuario,evento:eventoid,nombre:usuarioDb.nombre,apellido:usuarioDb.apellido,rol,usuarioRRPP}},evento,tipo},{new:true});
    // await Cliente.findOneAndUpdate({dni},{evento,tipo},{new:true});
    const clienteHtml = await Cliente.find({dni}).lean();
    var DateFormats = {
      fecha: "DD/MM/yyyy",
      hora: "HH:mm:ss"
    };
    handlebars.registerHelper("formatDate", function(datetime, format) {
      if (moment) {
        format = DateFormats[format] || format;
        return moment(datetime).format(format);
      }
      else {
        return datetime;
      }
    });
    handlebars.registerHelper("base64ImageSrc", function(string) {
      return new handlebars.SafeString(string);
    });
    const html = fs.readFileSync("./report/report.html", "utf8");
    const options = {
      format: "A4",
      orientation: "portrait",
      border: "10mm",
    };
    let logoUrl = fs.readFileSync('./images/e.png').toString('base64');
    logoUrl = "data:image/png;base64,"+logoUrl;
    const document = {
      html: html,
      data: {
        datos: clienteHtml,
        dataUrl,
        logoUrl,
      },
      path: "./comprobantes/comprobante-"+dni+".pdf",
      type: "",
    };
    pdf
    .create(document, options)
    .then((resultado) => {
      return res.status(200).json({ oki:false,ok: true, cliente: clienteNuevo  });
    })
    .catch((error) => {
      // return res.status(400).json({ ok:false, msg: error });
      console.log(error)
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "El cliente ya existe",
    });
  }
  // }
  
};
const crearClienteFreeTicket = async (req, res) => {
  const {cantidad,fecha,estado,usuario,evento,tipo,free,eventoid} = req.body;
  let eventoDb = await Evento.findOne({_id:eventoid});
  if(eventoDb){
    if(eventoDb.finalizado){
      return res.status(400).json({ ok:false, oki: false, msg:"Este evento esta cerrado, no se puede agregar ni actualizar ningun dato"});
    }
  }
  const usuarioDb = await Usuario.findById(usuario);
  let rol;
  let usuarioRRPP = "";
  for (let h = 0; h < usuarioDb.eventos.length; h++) {
    if(usuarioDb.eventos[h].evento===eventoid){
      rol = usuarioDb.eventos[h].rolEvento;
      if(usuarioDb.eventos[h].rolEvento === "TARJETERO" || usuarioDb.eventos[h].rolEvento === "ESPECIAL"){
        usuarioRRPP = usuarioDb.eventos[h].rrpp;
      }
    }
  }
  try {
    let tickets = [];
    for (let i = 0; i < cantidad; i++) {
      let eventot = await Evento.findOne({_id:eventoid});
      let clienteNuevo = new Cliente({dni:eventot.ticketGen,nombre:"-",apellido:"-",celular:0,fecha,estado,free,usuario,evento,tipo,ticket:true,esticket:true});
      await Evento.findOneAndUpdate({_id:eventoid},{ticketGen:eventot.ticketGen+1});
      await clienteNuevo.save();
      await Cliente.findOneAndUpdate({_id:clienteNuevo._id},{$push:{usuarios:{usuario,evento:eventoid,nombre:usuarioDb.nombre,apellido:usuarioDb.apellido,rol,usuarioRRPP}}},{new:true});
      let cliente = await Cliente.findOne({_id:clienteNuevo._id}).populate('usuario');
      tickets.push(cliente)
    }
    return res.status(200).json({ ok: true, tickets  });
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      ok: false,
      msg: "Error",
    });
  }
};
const subirArchivo = async(req,res)=>{
  const {dni,evento} = req.body;
  let dir = "./comprobantes/";
  const comprobar = fs.existsSync(path.join(dir,"comprobante-"+dni+".pdf"));
  if(!comprobar){
    return res.status(400).json({ status:"error",msg:"El PDF no esta guardado en el sistema"});
  }
  const pathToFile = path.join(dir,"comprobante-"+dni+".pdf");
  // const pathToFile = path.join("C:/temp/event/","comprobante-"+dni+".pdf");
  const { secure_url } = await cloudinary.uploader.upload(pathToFile);
  if(secure_url){
    const query = {dni,"entradas.evento":evento};
    const cliente = await Cliente.findOne(query);
    if(!cliente){
      return res.status(400).json({
        msg: `El cliente no existe en el sistema`,
      });
    }
    for (let i = 0; i < cliente.entradas.length; i++) {
      if(cliente.entradas[i].evento===evento){
        cliente.entradas[i].ultComp=secure_url;
      }
    }
    const clienteUpdate = await Cliente.replaceOne(query, cliente);
    // const clienteUpdate = await Cliente.findOneAndUpdate(query,{ultComp:secure_url},{new:true});
    return res.status(200).json({ ok:true, msg:"El archivo se ha subido exitosamente, para mandar PDF, abrir WhatsAppWeb",pdfurl:secure_url,id:cliente._id });
  }else{
    return res.status(400).json({ status:"error",msg:"Ha ocurrido un error"});
  }
};
const actualizarrCliente = async (req, res) => {
  const {dni,celular,fecha,usuario,evento,tipo,dataUrl,eventoid} = req.body;

  const eventoDb = await Evento.findOne({_id:eventoid});
  if(eventoDb){
    if(eventoDb.finalizado){
      return res.status(400).json({ ok:false, oki: false, msg:"Este evento esta cerrado, no se puede agregar ni actualizar ningun dato"});
    }
  }

  const cliente = await Cliente.findOne({dni});
  let bandera = false;
  let banderita = false
  if(cliente){
    if(cliente.usuarios.length!=0){
      cliente.usuarios.forEach((value)=>{
        if(value.usuario !== usuario){
          bandera=true;
        }
      });
    }
    if(cliente.entradas.length!=0){
      cliente.entradas.forEach((value)=>{
        if(value.evento === eventoid){
          banderita=true;
        }
      });
    }
  }
  if(banderita){
    return res.status(400).json({ ok:false, oki: false, msg:"El cliente ya se cargo en este evento"});
  }
  const usuarioDb = await Usuario.findById(usuario);
  let rol;
  let usuarioRRPP = "";
  for (let h = 0; h < usuarioDb.eventos.length; h++) {
    if(usuarioDb.eventos[h].evento===eventoid){
      rol = usuarioDb.eventos[h].rolEvento;
      if(usuarioDb.eventos[h].rolEvento === "TARJETERO" || usuarioDb.eventos[h].rolEvento === "ESPECIAL"){
        usuarioRRPP = usuarioDb.eventos[h].rrpp;
      }
    }
  }
  const update = {$push:{usuarios:{usuario,evento:eventoid,nombre:usuarioDb.nombre,apellido:usuarioDb.apellido,rol,usuarioRRPP}},celular,fecha,usuario,free:false,esticket:false,ticket:false,evento,tipo};
  // const update2 = {$push:{usuarios:{usuario}},celular,fecha,usuario,free:false,esticket:false,ticket:false,evento,tipo};
  // if(bandera){
  //   const clienteUpdate = await Cliente.findOneAndUpdate({dni},update,{new:true});
  //   console.log("bandera",bandera);
  //   return res.status(201).json({ ok:true, oki: false, cliente: clienteUpdate });
  // }else{
    try {
      const rrppDb = await Usuario.findById(usuario);
      // for(let i = 0;i<rrppDb.eventos.length;i++){
      //   if(rrppDb.eventos[i].evento==eventoid){
      //     if(rrppDb.eventos[i].cantFreeCargados>=rrppDb.eventos[i].maxFree){
      //       return res.status(400).json({ ok:false, oki: false, msg:"Has llegado al máximo de clientes"});
      //     }
      //   }
      // }
      const clienteUpdate= await Cliente.findOneAndUpdate({dni},update,{new:true});
      for(let i = 0;i<rrppDb.eventos.length;i++){
        if(rrppDb.eventos[i].evento==eventoid){
          if(rrppDb.eventos[i].rolEvento==="TARJETERO" || rrppDb.eventos[i].rolEvento==="ESPECIAL"){
            const rrppGenDb = await Usuario.findById(rrppDb.eventos[i].rrpp);
            for (let y = 0; y < rrppGenDb.eventos.length; y++) {
              if(rrppGenDb.eventos[y].evento==eventoid){
                rrppGenDb.eventos[y].deudaComision = rrppGenDb.eventos[y].deudaComision+rrppGenDb.eventos[y].comisionRRPP;
                break;
              }
            }
            await Usuario.replaceOne({estado: true, _id: rrppDb.eventos[i].rrpp},rrppGenDb);
          }
          rrppDb.eventos[i].deuda = rrppDb.eventos[i].deuda+rrppDb.eventos[i].comisionEnt;
          rrppDb.eventos[i].cantFreeCargados = rrppDb.eventos[i].cantFreeCargados+1;
          break;
        }
      }
      await Usuario.replaceOne({estado: true, _id: usuario},rrppDb);

      const clienteHtml = await Cliente.find({dni}).lean();
      var DateFormats = {
        fecha: "DD/MM/yyyy",
        hora: "HH:mm:ss"
      };
      handlebars.registerHelper("formatDate", function(datetime, format) {
        if (moment) {
          format = DateFormats[format] || format;
          return moment(datetime).format(format);
        }
        else {
          return datetime;
        }
      });
      handlebars.registerHelper("base64ImageSrc", function(string) {
        return new handlebars.SafeString(string);
      });
      const html = fs.readFileSync("./report/report.html", "utf8");
      const options = {
        format: "A4",
        orientation: "portrait",
        border: "10mm",
      };
      let logoUrl = fs.readFileSync('./images/e.png').toString('base64');
      logoUrl = "data:image/png;base64,"+logoUrl;

      const document = {
        html: html,
        data: {
          datos: clienteHtml,
          dataUrl,
          logoUrl,
        },
        path: "./comprobantes/comprobante-"+dni+".pdf",
        type: "",
      };
      pdf
      .create(document, options)
      .then((resultado) => {
        return res.status(200).json({ oki:false,ok: true, cliente: clienteUpdate  });
      })
      .catch((error) => {
        console.log(error);
        return res.status(400).json({ ok:false, msg: error });
      });
      // return res.status(201).json({ ok:true, oki: false, cliente: clienteUpdate  });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        ok: false,
        msg: "Hable con el administrador",
      });
    }
  // }
};
const actualizarrClienteFree = async (req, res) => {
  const {dni,celular,fecha,usuario,evento,tipo,dataUrl,free,eventoid} = req.body;
  const eventoDb = await Evento.findOne({_id:eventoid});
  if(eventoDb){
    if(eventoDb.finalizado){
      return res.status(400).json({ ok:false, oki: false, msg:"Este evento esta cerrado, no se puede agregar ni actualizar ningun dato"});
    }
  }
  const cliente = await Cliente.findOne({dni});
  let bandera = false;
  let banderita = false;
  if(cliente){
    if(cliente.usuarios.length!=0){
      cliente.usuarios.forEach((value)=>{
        if(value.usuario !== usuario){
          bandera=true;
        }else{
          
        }
      });
    }
    if(cliente.entradas.length!=0){
      cliente.entradas.forEach((value)=>{
        if(value.evento === eventoid){
            banderita = true;
          }
      });
    }
  }
  if(banderita){
    return res.status(400).json({ ok:false, oki: false, msg:"El cliente ya se cargo en este evento"});
  }

  const usuarioDb = await Usuario.findById(usuario);
  let rol;
  let usuarioRRPP = "";
  for (let h = 0; h < usuarioDb.eventos.length; h++) {
    if(usuarioDb.eventos[h].evento===eventoid){
      rol = usuarioDb.eventos[h].rolEvento;
      if(usuarioDb.eventos[h].rolEvento === "TARJETERO" || usuarioDb.eventos[h].rolEvento === "ESPECIAL"){
        usuarioRRPP = usuarioDb.eventos[h].rrpp;
      }
    }
  }

  const update = {$push:{usuarios:{usuario,evento:eventoid,nombre:usuarioDb.nombre,apellido:usuarioDb.apellido,rol,usuarioRRPP}},celular,fecha,free,usuario,evento,tipo};
  // const update2 = {$push:{usuarios:{usuario,evento:eventoid}},celular,fecha,free,usuario,evento,tipo};
  // if(bandera){
  //   const clienteUpdate = await Cliente.findOneAndUpdate({dni},update,{new:true});
  //   return res.status(201).json({ ok:true, oki: false, cliente: clienteUpdate });
  // }else{
    try {
      const clienteUpdate= await Cliente.findOneAndUpdate({dni},update,{new:true});
      //ACUMULANDO FREE
      const RRPPDb = await Usuario.findById(usuario);
      for(let i = 0;i<RRPPDb.eventos.length;i++){
        if(RRPPDb.eventos[i].evento===eventoid){
          RRPPDb.eventos[i].cantFreeCargados += 1;
          break;
        }
      }
      const query = { estado: true, _id:usuario};
      await Usuario.replaceOne(query,RRPPDb);
      // await Cliente.findOneAndUpdate({dni},{evento,tipo},{new:true});
      const clienteHtml = await Cliente.find({dni}).lean();
      var DateFormats = {
        fecha: "DD/MM/yyyy",
        hora: "HH:mm:ss"
      };
      handlebars.registerHelper("formatDate", function(datetime, format) {
        if (moment) {
          format = DateFormats[format] || format;
          return moment(datetime).format(format);
        }
        else {
          return datetime;
        }
      });
      handlebars.registerHelper("base64ImageSrc", function(string) {
        return new handlebars.SafeString(string);
      });
      const html = fs.readFileSync("./report/report.html", "utf8");
      
      const options = {
        format: "A4",
        orientation: "portrait",
        border: "10mm",
      };
      let logoUrl = fs.readFileSync('./images/e.png').toString('base64');
      logoUrl = "data:image/png;base64,"+logoUrl;
      const document = {
        html: html,
        data: {
          datos: clienteHtml,
          dataUrl,
          logoUrl,
        },
        path: "./comprobantes/comprobante-"+dni+".pdf",
        type: "",
      };
      pdf
      .create(document, options)
      .then((resultado) => {
        // return res.status(200).json({ oki:false,ok: true, cliente: clienteUpdate  });
        return res.status(200).json({ oki:false,ok: true, cliente: clienteUpdate  });
      })
      .catch((error) => {
        console.log(error)
        // return res.status(400).json({ ok:false, msg: error });
        return res.status(400).json({ ok:false, msg: error });
      });
      // return res.status(201).json({ ok:true, oki: false, cliente: clienteUpdate  });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        ok: false,
        msg: "Hable con el administrador",
      });
    }
  // }
};
const actualizarrClienteByAdmin = async (req, res) => {
  const {dni,celular,fecha,usuario,evento,tipo,dataUrl,eventoid} = req.body;
  try {
      const cliente = await Cliente.findOne({dni});
      if(!cliente){
        return res.status(400).json({
          ok: false,
          msg: "El cliente no existe",
        });
      }
      // const update = {celular,fecha,usuario,evento,tipo};
      cliente.fecha = fecha;
      cliente.usuario = usuario;
      cliente.evento = evento;
      cliente.tipo = tipo;
      cliente.celular = celular;
      for (let i = 0; i < cliente.entradas.length; i++) {
        if(cliente.entradas[i].evento===eventoid){
          cliente.entradas[i].celular=celular;
        }
      }
      await Cliente.replaceOne({estado: true, dni:dni},cliente);
      // const clienteUpdate= await Cliente.findOneAndUpdate({dni},update,{new:true});
      const clienteHtml = await Cliente.find({dni}).lean();
      var DateFormats = {
        fecha: "DD/MM/yyyy",
        hora: "HH:mm:ss"
      };
      handlebars.registerHelper("formatDate", function(datetime, format) {
        if (moment) {
          format = DateFormats[format] || format;
          return moment(datetime).format(format);
        }
        else {
          return datetime;
        }
      });
      handlebars.registerHelper("base64ImageSrc", function(string) {
        return new handlebars.SafeString(string);
      });
      const html = fs.readFileSync("./report/report.html", "utf8");
      const options = {
        format: "A4",
        orientation: "portrait",
        border: "10mm",
      };
      let logoUrl = fs.readFileSync('./images/e.png').toString('base64');
      logoUrl = "data:image/png;base64,"+logoUrl;
      const document = {
        html: html,
        data: {
          datos: clienteHtml,
          dataUrl,
          logoUrl,
        },
        path: "./comprobantes/comprobante-"+dni+".pdf",
        type: "",
      };
      pdf
      .create(document, options)
      .then((resultado) => {
        return res.status(200).json({ ok: true, cliente });
      })
      .catch((error) => {
        console.log(error)
        return res.status(400).json({ ok:false, msg: error });
      });
      // return res.status(201).json({ ok:true, cliente: clienteUpdate  });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        ok: false,
        msg: "Hable con el administrador",
      });
    }
};
const updateClienteByAdmin = async (req, res) => {
  const {dni,celular,nombre,apellido} = req.body;
  try {
      const cliente = await Cliente.findOne({dni});
      if(!cliente){
        return res.status(400).json({
          ok: false,
          msg: "El cliente no existe",
        });
      }
      const update = {celular,nombre,apellido};
      const clienteUpdate= await Cliente.findOneAndUpdate({dni},update,{new:true});
      return res.status(201).json({ ok:true, cliente: clienteUpdate  });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        ok: false,
        msg: "Hable con el administrador",
      });
    }
};
const asociarEventoCliente = async (req, res) => {
  const { uid, evento, tipo, importe, usuario,nombrevento,celular } = req.body;

  let rol;
  let usuarioRRPP = "";
  const rrppDb = await Usuario.findById(usuario);
  for(let i = 0;i<rrppDb.eventos.length;i++){
    if(rrppDb.eventos[i].evento==evento){
      rol = rrppDb.eventos[i].rolEvento;
      if(rrppDb.eventos[i].rolEvento === "TARJETERO" || rrppDb.eventos[i].rolEvento === "ESPECIAL"){
        usuarioRRPP = rrppDb.eventos[i].rrpp;
      }
    }
  }

  const entradas = {tipo,evento,importe,usuario,nombre:nombrevento,celular,rol,usuarioRRPP};
  
  const eventoDb = await Evento.findOne({_id:evento});
  if(eventoDb){
    if(eventoDb.finalizado){
      return res.status(400).json({ ok:false, oki: false, msg:"Este evento esta cerrado, no se puede agregar ni actualizar ningun dato"});
    }
  }
  try {
    const clienteDb = await Cliente.findById({_id:uid});
    if(!clienteDb){
      return res.status(400).json({
        msg: `El cliente no existe en el sistema`,
      });
    }
    let bandera = false;
    for(let i = 0;i<clienteDb.entradas.length;i++){
      if(clienteDb.entradas[i].evento===evento){
        bandera = true;
        clienteDb.entradas[i].importe = importe;
        clienteDb.entradas[i].tipo = tipo;
        clienteDb.entradas[i].usuario = usuario;
        clienteDb.entradas[i].nombre = nombrevento;
        clienteDb.entradas[i].celular = celular;
        clienteDb.entradas[i].rol = rol;
        clienteDb.entradas[i].usuarioRRPP = usuarioRRPP;
        break;
      }
    }
    // const rrppDb = await Usuario.findById(usuario);
    for(let i = 0;i<rrppDb.eventos.length;i++){
      if(rrppDb.eventos[i].evento==evento){
        rrppDb.eventos[i].totalEntradas = rrppDb.eventos[i].totalEntradas+importe;
        break;
      }
    }
    await Usuario.replaceOne({estado: true, _id: usuario},rrppDb);
    if(!bandera){
      const query = { estado: true, _id: uid};
      const update = {$push:{entradas}};
      const cliente = await Cliente.findOneAndUpdate(query,update,{new:true});
        if (!cliente) {
          return res.status(400).json({
            msg: `El cliente no se puede agregar a ese evento`,
          });
        }
        return res.status(201).json( cliente );
    }else{
      const query = { estado: true, _id: uid};
      const cliente = await Cliente.replaceOne(query,clienteDb);
      if (!cliente) {
        return res.status(400).json({
            msg: `El cliente no se puede reemplazar`,
        });
      }
      return res.status(201).json( cliente );
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const desasociarEventoCliente = async (req, res) => {
  const { evento,id } = req.body;
  const eventoDb = await Evento.findOne({_id:evento});
  if(eventoDb){
    if(eventoDb.finalizado){
      return res.status(400).json({ ok:false, oki: false, msg:"Este evento esta cerrado, no se puede agregar ni actualizar ningun dato"});
    }
  }
  const query = { estado: true, _id: id};
  try {
    const clienteDb = await Cliente.findById({_id:id});
    if(!clienteDb){
      return res.status(400).json({
        msg: `El cliente no existe en el sistema`,
      });
    }
    let userid;
    //Limpiando usuario
    for (let i = 0; i < clienteDb.entradas.length; i++) {
      if(clienteDb.entradas[i].evento===evento){
        const usuariosF = clienteDb.usuarios.filter(value=>{ 
          if(value.usuario === clienteDb.entradas[i].usuario){
            userid=value.usuario;
          }
          return value.evento !== evento;
        });
        clienteDb.usuarios = usuariosF;
      }
    }
    //Limpiando usuario calculo
    const rrppDb = await Usuario.findById(userid);
    for(let i = 0;i<rrppDb.eventos.length;i++){
      if(rrppDb.eventos[i].evento===evento){
        if(rrppDb.eventos[i].rolEvento==="TARJETERO" || rrppDb.eventos[i].rolEvento==="ESPECIAL"){
          const rrppGenDb = await Usuario.findById(rrppDb.eventos[i].rrpp);
          for (let y = 0; y < rrppGenDb.eventos.length; y++) {
            if(rrppGenDb.eventos[y].evento===evento){
              rrppGenDb.eventos[y].deudaComision = rrppGenDb.eventos[y].deudaComision-rrppGenDb.eventos[y].comisionRRPP;
              break;
            }
          }
          await Usuario.replaceOne({estado: true, _id: rrppDb.eventos[i].rrpp},rrppGenDb);
        }
        rrppDb.eventos[i].deuda = rrppDb.eventos[i].deuda-rrppDb.eventos[i].comisionEnt;
        for (let f = 0; f < clienteDb.entradas.length; f++) {
          if(clienteDb.entradas[f].usuario===userid){
            rrppDb.eventos[i].totalEntradas = rrppDb.eventos[i].totalEntradas-clienteDb.entradas[f].importe;
          }
        }
        break;
      }
    }
    await Usuario.replaceOne({estado: true, _id: userid},rrppDb);
    //Limpiando entrada
    const entradasF = clienteDb.entradas.filter(value=>{ 
      return value.evento !== evento;
    });
    clienteDb.entradas = entradasF;
    
    const clienteNuevo = await Cliente.replaceOne(query, clienteDb);
    return res.status(201).json( clienteNuevo );
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const desasociarEventoClienteSinEvento = async (req, res) => {
  const { uid,id,eventoid } = req.body;
  const query = { estado: true, _id: id};
  // const clienteBd = await Cliente.findById(id);
  // let eventoid;
  // if(clienteBd){
  //   for (let i = 0; i < clienteBd.entradas.length; i++) {
  //     if(clienteBd.entradas[i].usuario===uid){
  //       eventoid = clienteBd.entradas[i].evento;
  //     }
  //   }
  // }
  const eventoDb = await Evento.findOne({_id:eventoid});
  if(eventoDb){
    if(eventoDb.finalizado){
      return res.status(400).json({ ok:false, oki: false, msg:"El evento esta cerrado, no se puede eliminar/desasociar ningun dato"});
    }
  }

  try {
    const clienteDb = await Cliente.findById({_id:id});
    if(!clienteDb){
      return res.status(400).json({
        msg: `El cliente no existe en el sistema`,
      });
    }
    const rrppDb = await Usuario.findById(uid);
    for(let i = 0;i<rrppDb.eventos.length;i++){
      if(rrppDb.eventos[i].evento==eventoid){
        if(rrppDb.eventos[i].rolEvento==="TARJETERO" || rrppDb.eventos[i].rolEvento==="ESPECIAL"){
          const rrppGenDb = await Usuario.findById(rrppDb.eventos[i].rrpp);
          for (let y = 0; y < rrppGenDb.eventos.length; y++) {
            if(rrppGenDb.eventos[y].evento===eventoid){
              rrppGenDb.eventos[y].deudaComision = rrppGenDb.eventos[y].deudaComision-rrppGenDb.eventos[y].comisionRRPP;
              break;
            }
          }
          await Usuario.replaceOne({estado: true, _id: rrppDb.eventos[i].rrpp},rrppGenDb);
        }
        rrppDb.eventos[i].deuda = rrppDb.eventos[i].deuda-rrppDb.eventos[i].comisionEnt;
        for (let f = 0; f < clienteDb.entradas.length; f++) {
          if(clienteDb.entradas[f].usuario===uid){
            rrppDb.eventos[i].totalEntradas = rrppDb.eventos[i].totalEntradas-clienteDb.entradas[f].importe;
          }
        }
        break;
      }
    }
    await Usuario.replaceOne({estado: true, _id: uid},rrppDb);
    // const entradasF = [];
    const entradasF = clienteDb.entradas.filter(value=>{ 
      return value.evento !== eventoid ;
    });
    clienteDb.entradas = entradasF;
    const usuariosF = clienteDb.usuarios.filter(value=>{ 
      return value.evento !== eventoid;
    });
    clienteDb.usuarios = usuariosF;
    const clienteNuevo = await Cliente.replaceOne(query, clienteDb);

    return res.status(201).json( clienteNuevo );
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const actualizarCliente = async (req, res) => {
  const { id } = req.params;
  const { state, user, ...data } = req.body;
  data.user = req.uid;
  try {
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        ok: false,
        msg: "Evento no existe por ese id",
      });
    }
    if (event.user._id.toString() !== req.uid) {
      return res.status(401).json({
        ok: false,
        msg: "No tiene privilegio de editar este evento",
      });
    }
    const eventUpdate = await Event.findByIdAndUpdate(id, data, {
      new: true,
    }).populate("user", "name");
    res.json({
      ok: true,
      eventUpdate,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const eliminarCliente = async (req, res) => {
  const { id } = req.params;
  //Fisicamente lo borramos
  //const Event = await Event.findByIdAndDelete(id);
  //Borrando con bandera
  try {
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        ok: false,
        msg: "Evento no existe por ese id",
      });
    }
    if (event.user._id.toString() !== req.uid) {
      return res.status(401).json({
        ok: false,
        msg: "No tiene privilegio de editar este evento",
      });
    }
    const eventDeleted = await Event.findByIdAndUpdate(
      id,
      { state: false },
      { new: true }
    ).populate("user", "name");
    res.json({
      ok: true,
      eventDeleted,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const deleteCliente = async (req, res) => {
  const { id } = req.body;
  try {
    const cliente = await Cliente.findById(id);
    if (!cliente) {
      return res.status(404).json({
        ok: false,
        msg: "Cliente no existe por ese id",
      });
    }
    const clienteDeleted = await Cliente.findByIdAndDelete(id);
    res.json({
      ok: true,
      clienteDeleted,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
// const agregarticketfalse = async (req, res) => {
//   const clientes = await Cliente.find({estado:true});
//   for (let i = 0; i < clientes.length; i++) {
//     await Cliente.findOneAndUpdate({_id:clientes[i]._id},{ticket:false});
//   }
// };

module.exports = {
  getClientes,
  getClienteByRpp,
  eliminarCliente,
  actualizarCliente,
  crearCliente,
  verificarCliente,
  actualizarrCliente ,
  verificarClienteByDni,
  getClientesVerificados,
  asociarEventoCliente,
  desasociarEventoCliente,
  getClientesByEvento,
  getClientesBuscados,
  verificarHash,
  setHash,
  subirArchivo,
  getClienteEdit,
  getClientesByEventoAndRRPP,
  actualizarrClienteFree,
  crearClienteFree,
  getClientesFreeByRRPP,
  getClientesPorTarjeteroBuscados,
  desasociarEventoClienteSinEvento,
  getClientesFreeByEvento,
  resetearIngresos,
  resetearFREE,
  pasarPagoAFree,
  actualizarrClienteByAdmin,
  getClientesBuscadosTotal,
  getClientesVeriBuscados,
  crearClienteFreeTicket,
  getTicketsFreeByEvento,
  loginClienteFree,
  autoCargaFree,
  autoActualizarFree,
  // agregarticketfalse,
  setHashSinToken,
  verificarClienteByDniSinUpdate,
  subirArchivoSinToken,
  verificarClienteSinToken,
  resetearTODO,
  getClientesAll,
  deleteCliente,
  updateClienteByAdmin,
  getClientesBuscadosTotalAdmin,
  reenviarWSP,
  getCliente,
  sacarTodos,
  crearClienteMasivo,
};


  
