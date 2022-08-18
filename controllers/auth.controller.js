const { response } = require("express");
const bcrypt = require("bcryptjs");
const Usuario = require("../models/usuario");
const Cliente = require("../models/cliente");
const { generarJWT } = require("../helpers/jwt");
const { Evento } = require("../models");

const crearUsuario = async (req, res = response) => {
  const { email, password,dni,rrpp,comisionRRPP,comisionEnt,maxFree,evento,rolEvento,eventoNombre,rrppNombre } = req.body;
  try {
    let usuario = await Usuario.findOne({ email });
    let usuarioDb = await Usuario.findOne({ dni });
    if(usuarioDb){
      return res.status(400).json({
        ok: false,
        msg: "El DNI de rpp ya existe en el sistema, ingrese otro",
      });
    }
    //let evento = await Evento.findOne({ evento });
    if (usuario) {
      return res.status(400).json({
        ok: false,
        msg: "El EMAIL rpp ya existe en el sistema, ingrese otro",
      });
    }
    //usuario.evento = evento.uid;
    usuario = new Usuario(req.body);

    // Encriptar contraseña
    const salt = bcrypt.genSaltSync();
    usuario.password = bcrypt.hashSync(password, salt);

    const userdb = await usuario.save();
    //ASOCIANDO EVENTOS A RRPP
    // const queryevento = { estado: true };
    // const eventos = await Evento.find(queryevento);
    const eventoss = [];
    // for(let i = 0; i<eventos.length;i++){
    const eventod = {
      evento,
      eventoNombre,
      deuda:0,
      deudaComision: 0,
      cantFreeCargados:0,
      totalEntradas:0,
      rrpp,
      rrppNombre,
      comisionRRPP,
      comisionEnt,
      maxFree,
      rolEvento
    }
    eventoss.push(eventod);
    // }
    const queryeventous = { estado: true, _id: userdb.id};
    await Usuario.findOneAndUpdate(queryeventous,{$push:{eventos: eventoss}},{new:true});
    // let update;
    // if(comisionRRPP===undefined||comisionRRPP===''||comisionRRPP===null){
    //   update = {rrpp,comisionRRPP:0};
    // }else{
    //   update = {rrpp};
    // }
    // await Usuario.findOneAndUpdate(queryeventous,update,{new:true});
    // Generar JWT
    const token = await generarJWT(usuario.id, usuario.nombre);

    res.status(201).json({
      ok: true,
      uid: usuario.id,
      nombre: usuario.nombre,
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Por favor hable con el administrador",
    });
  }
};
const loginUsuario = async (req, res = response) => {
  const { email, password } = req.body;

  try {
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(400).json({
        ok: false,
        msg: "El usuario no existe con ese email",
      });
    }
    // Confirmar los passwords
    const validPassword = bcrypt.compareSync(password, usuario.password);

    if (!validPassword) {
      return res.status(400).json({
        ok: false,
        msg: "Password incorrecto",
      });
    }

    // Generar JWT
    const token = await generarJWT(usuario.id, usuario.nombre);

    res.json({
      ok: true,
      uid: usuario.id,
      nombre: usuario.nombre,
      rol: usuario.rol,
      maxFree: usuario.maxFree ? usuario.maxFree : 0,
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Por favor hable con el administrador",
    });
  }
};
const getRrppEdit = async (req, res) => {
  const { id } = req.params;
  const query = { estado: true, _id: id };
  try {
    const usuario = await Usuario.findOne(query);
    //const clientes = await Cliente..populate("usuario", "nombre");
    if (!usuario) {
      return res.status(400).json({
        msg: `El usuario no existe`,
      });
    }
    return res.status(201).json({ usuario });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const revalidarToken = async (req, res = response) => {
  const { uid, nombre} = req;
  let rol = "";
  let usuario;
  try {
    usuario = await Usuario.findById({ _id: uid });
    if(usuario){
      rol = usuario.rol;
    }else{
      const cliente= await Cliente.findById({ _id: uid });
      if(cliente){
        rol = cliente.rol;
      }else{
        rol = "CLIENTE";
      }
    }
  } catch (error) {
    console.log(error)
  }
  
  // Generar JWT
  const token = await generarJWT(uid, nombre);

  res.json({
    ok: true,
    token,
    uid,
    nombre,
    rol
  });
};
const asociarEventoRpp = async (req, res) => {
  const { uid, evento,eventoNombre,rrpp,rrppNombre,comisionRRPP,comisionEnt,maxFree,rolEvento } = req.body;
  const eventoss = [{
    evento,
    eventoNombre,
    deuda:0,
    deudaComision: 0,
    cantFreeCargados:0,
    totalEntradas:0,
    rrpp,
    rrppNombre,
    comisionRRPP,
    comisionEnt,
    maxFree,
    rolEvento
  }]
  const query = { estado: true, _id: uid};
  const update = {$push:{eventos:eventoss}};
  try {
    const usuarioDb = await Usuario.findById({_id:uid});
    if(!usuarioDb){
      return res.status(400).json({
        msg: `El usuario RPP no existe en el sistema`,
      });
    }
    let bande=false;
    for (let i = 0; i < usuarioDb.eventos.length; i++) {
      if(usuarioDb.eventos[i].evento===evento){
        bande=true;
        break;
      }
    }
    if(bande){
      return res.status(400).json({
        msg: `El usuario ya esta asociado a ese evento`,
      });
    }
    const usuario = await Usuario.findOneAndUpdate(query,update,{new:true});
    if (!usuario) {
      return res.status(400).json({
        msg: `El usuario no se puede actualizar`,
      });
    }
    return res.status(201).json( usuario );
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const desasociarEventoRpp = async (req, res) => {
  const { uid, evento } = req.body;
  const query = { estado: true, _id: uid};
  try {
    const usuarioDb = await Usuario.findById({_id:uid});
    if(!usuarioDb){
      return res.status(400).json({
        msg: `El usuario no existe en el sistema`,
      });
    }
    const eventosF = usuarioDb.eventos.filter((value)=>{ 
      return value.evento != evento;
    });
    usuarioDb.eventos = eventosF;
    
    const usuarioNuevo = await Usuario.replaceOne(query, usuarioDb);
    return res.status(201).json( usuarioNuevo );
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const getRpps = async (req, res) => {
  let totalCantUsuarios = 0;
  let totalUsuarios = [];
  const queryRRPP = {estado:true, $or:[{rol:"RRPP"},{rol:"ESPECIAL"}]};
  const rrpps = await Usuario.find(queryRRPP).populate('rrpp');
  for (let i = 0; i < rrpps.length; i++) {
    totalUsuarios.push(rrpps[i]);
    totalCantUsuarios = totalCantUsuarios +1;
    // const queryTar = { estado: true, "rrpp":rrpps[i]._id,"rol":"TARJETERO"};
    // let [totalTar, rrppsTar] = await Promise.all([
    //   Usuario.countDocuments(queryTar),
    //   Usuario.find(queryTar).populate("rrpp").sort([['rrpp'], ['apellido']])
    // ]);
    // totalCantUsuarios = totalCantUsuarios +totalTar;
    // for (let u = 0; u < rrppsTar.length; u++) {
    //   totalUsuarios.push(rrppsTar[u]);
    // }
  }
  res.json({ total:totalCantUsuarios, rpps:totalUsuarios});
};
const getRppsParaTicket = async (req, res) => {
  const queryRRPP = {estado:true};
  let [total, rrpps] = await Promise.all([
    Usuario.countDocuments(queryRRPP),
    Usuario.find(queryRRPP).populate("rrpp").sort([['rrpp'], ['apellido']])
  ]);
  res.json({ total, rpps: rrpps});
};
const getRppsGenerales = async (req, res) => {
  const query = { estado: true, rol:'RRPP'};

  const [total, rpps] = await Promise.all([
    Usuario.countDocuments(query),
    Usuario.find(query)
  ]);
  res.json({ total, rpps});
};
const getRppsByEvento = async (req, res) => {
  const {idevento} = req.params;
  const query = { estado: true, "eventos.evento":idevento };

  const [total, rpps] = await Promise.all([
    Usuario.countDocuments(query),
    Usuario.find(query)
  ]);
  res.json({ total, rpps});
};
const getRrppsByEvento = async (req, res) => {
  const {idevento} = req.params;
  const query = { estado: true, "eventos.evento":idevento };
  const rrpps = await Usuario.find(query);
  let rpps = [];
  let total = 0;
  for(let i = 0;i<rrpps.length;i++){
    const queryCliente = {estado:true, "usuarios.usuario":rrpps[i]._id, "entradas.evento":idevento}
    const clientes = await Cliente.find(queryCliente);
    if(clientes.length!=0){
      rpps.push(rrpps[i]);
      total = total+1;
    }
  }
  res.json({ total, rpps});
};
const getRrppsByEventoParaAsociar = async (req, res) => {
  const {idevento} = req.params;
  const query = { estado: true, "eventos.evento":idevento,"eventos.rolEvento":"RRPP"};
  const [total, rpps] = await Promise.all([
    Usuario.countDocuments(query),
    Usuario.find(query)
  ]);
  res.json({ total, rpps});
};
const getRppsByGeneral = async (req, res) => {
  const {id} = req.params;
  const query = { estado: true, usuario:id };

  const [total, rpps] = await Promise.all([
    Usuario.countDocuments(query),
    Usuario.find(query)
  ]);
  res.json({ total, rpps});
};
const getRppsByRRPP = async (req, res) => {
  const {id} = req.params;
  const query = { estado: true, "eventos.rrpp":id };

  const [total, rpps] = await Promise.all([
    Usuario.countDocuments(query),
    Usuario.find(query)
  ]);
  res.json({ total, rpps});
};
const getGananciaByGeneral = async (req, res) => {
  const {id} = req.params;
  const queryusuario = { estado: true, _id:id };
  const usuario = await Usuario.findOne(queryusuario);
  let ganClientes = 0;
  let ganComision = 0;
  let ganTotal = 0;
  for (let i = 0; i < usuario.eventos.length; i++) {
    ganClientes = ganClientes+usuario.eventos[i].deuda;
    ganComision= ganComision+usuario.eventos[i].deudaComision;
    ganTotal=ganTotal+usuario.eventos[i].totalEntradas;
  }
  
  // const ganTotal = ganComision+ganClientes;
  // console.log(ganTotal)
  res.json({ gancomision:ganComision, gantotal:ganTotal, ganclientes:ganClientes});
};
const getGananciaByOperativo = async (req, res) => {
  const {id,evento} = req.params;
  const queryusuario = { estado: true, _id:id };
  const usuario = await Usuario.findOne(queryusuario);
  const queryclientes = { estado: true, free:false, "usuarios.usuario":id };
  const cli = await Cliente.find(queryclientes);
  let cantidad = 0;
  for(let i = 0 ;i<cli.length;i++){
    cantidad = cantidad + cli[i].entradas.length;
  }
  const ganclientes = cantidad*usuario.comisionEnt;
  res.json({ ganclientes});
};
const getGananciaTotalByOperativo = async (req, res) => {
  const {id,idevento} = req.params;
  let deutotal = 0;
  let gantotal = 0;
  const queryusuario = { estado: true, _id:id};
  const usuario = await Usuario.findOne(queryusuario);
  for (let i = 0; i < usuario.eventos.length; i++) {
    if(usuario.eventos[i].evento===idevento){
      deutotal = usuario.eventos[i].deuda;
      gantotal = usuario.eventos[i].totalEntradas;
    }
  }
  // const queryclientes = { estado: true, free:false, "usuarios.usuario":id ,"entradas.evento":idevento};
  // const cli = await Cliente.find(queryclientes);
  // let cantidad = 0;
  // for(let i = 0 ;i<cli.length;i++){
  //   cantidad = cantidad + cli[i].entradas.length;
  // }
  // const ganclientes = cantidad*usuario.comisionEnt;
  
  res.json({ deutotal,gantotal});
};
const getDeudaByAdmin = async (req, res) => {
  const queryevento = { estado: true};
  const eventos = await Evento.find(queryevento);
  let totalRRPPComision = 0;
  let sumaRpp = 0;
  let sumaTar = 0;
  let sumaTotalTarTo = 0;
  let sumaTotalEntradasTar = 0;
  let sumaTotalEntradasRRPP = 0;

  let acuEntCliGen=0;
  let totalSumaRrpps=0;
  //CICLO PARA ASIGNAR POR EVENTO LAS DEUDAS DE LOS RRPP Y TARJETEROS
  // for(let m = 0;m<eventos.length;m++){  
  const queryrpps = { estado: true, rol:"RRPP"};
  const rpps = await Usuario.find(queryrpps);
  for (let i = 0; i < rpps.length; i++) {
    for (let j = 0; j < rpps[i].eventos.length; j++) {
      totalSumaRrpps = totalSumaRrpps+rpps[i].eventos[j].deuda;
      totalSumaRrpps = totalSumaRrpps+rpps[i].eventos[j].deudaComision;
      acuEntCliGen = acuEntCliGen+rpps[i].eventos[j].totalEntradas;
    }
  }
  console.log(acuEntCliGen);
    // for(let i = 0;i<rpps.length;i++){
    //   sumaTotalEntradasRRPP = 0;
    //   totalRRPPComision = 0;
    //   const querytar = { estado: true, "eventos.rrpp":rpps[i]._id,"eventos.evento":eventos[m]._id };
    //   const tar = await Usuario.find(querytar);
    //   // console.log(rpps[i].nombre);
    //   // console.log(tar);
    //   const queryClienteGen = {estado:true, free:false,"usuarios.usuario": rpps[i]._id,"entradas.evento": eventos[m]._id};
    //   const cli = await Cliente.find(queryClienteGen);
    //   //SUMA TOTAL ENTRADAS
    //   for(let k = 0;k<cli.length;k++){
    //     for(let l = 0; l<cli[k].entradas.length;l++){
    //       sumaTotalEntradasRRPP = sumaTotalEntradasRRPP + cli[k].entradas[l].importe;
    //     }
    //   }
    //   let cantidadRRPP = 0;
    //   for(let p = 0;p<cli.length;p++){
    //     for(let j = 0;j<cli[p].entradas.length;j++){
    //       if(cli[p].entradas[j].evento==eventos[m]._id){
    //         if(cli[p].entradas[j].usuario==rpps[i]._id){
    //           cantidadRRPP = cantidadRRPP + 1;
    //         }
    //       }
    //     }
      // }
      //TOTAL DE UN USUARIO RRPP INDIVIDUAL
      // sumaRpp = rpps[i].comisionEnt*cantidadRRPP;
      // totalRRPPComision = totalRRPPComision+sumaRpp;
      // for(let j = 0;j<tar.length;j++){
      //   sumaTotalEntradasTar = 0;
      //   sumaTar = 0;
      //   sumaTotalTarTo=0;
      //   const queryTarCom = { estado: true, rol : "TARJETERO", _id: tar[j]._id};
      //   const rppsTarCom = await Usuario.findOne(queryTarCom);
      //   const queryTar = {estado:true, free:false,"usuarios.usuario": tar[j]._id, "entradas.evento": eventos[m]._id.toString()};
      //   //CANTIDAD DE CLIENTES DEL TARJETERO
      //   const cliTar = await Cliente.countDocuments(queryTar);
      //   //SUMA TOTAL ENTRADAS
      //   const cliTotalEntradasTar = await Cliente.find(queryTar);
      //   for(let k = 0;k<cliTotalEntradasTar.length;k++){
      //     for(let l = 0; l<cliTotalEntradasTar[k].entradas.length;l++){
      //       sumaTotalEntradasTar = sumaTotalEntradasTar + cliTotalEntradasTar[k].entradas[l].importe;
      //     }
      //   }
      //   //SUMA TOTAL DE GANANCIAS DE TARJETERO INDIVIDUAL
      //   sumaTar = rppsTarCom.comisionEnt*cliTar;
      //   //SUMA TOTAL DE GANANCIA QUE LE QUEDA AL RRPP DE SUS TARJETEROS
      //   sumaTotalTarTo = sumaTotalTarTo+(rpps[i].comisionRRPP*cliTar);
      //   //SUMA TOTAL DE GANANCIA DE COMISION MAS GANANCIA INDIVIDUAL DEL RRPP
      //   totalRRPPComision = totalRRPPComision + sumaTotalTarTo;
      //   //GUARDANDO EN TARJETERO SU DEUDA DE ESE EVENTO
      //   const tarjeteroDb = await Usuario.findById(tar[j]._id);
      //   for(let i = 0;i<tarjeteroDb.eventos.length;i++){
      //     if(tarjeteroDb.eventos[i].evento==eventos[m]._id){
      //       tarjeteroDb.eventos[i].deuda = sumaTar;
      //       tarjeteroDb.eventos[i].totalEntradas = sumaTotalEntradasTar;
      //       break;
      //     }
      //   }
      //   const query = { estado: true, _id: tar[j]._id};
      //   await Usuario.replaceOne(query,tarjeteroDb);
      // } 
      // const rrppDb = await Usuario.findById(rpps[i]._id);
      // for(let i = 0;i<rrppDb.eventos.length;i++){
      //   if(rrppDb.eventos[i].evento==eventos[m]._id){
      //     rrppDb.eventos[i].deuda = totalRRPPComision;
      //     rrppDb.eventos[i].totalEntradas = sumaTotalEntradasRRPP;
      //     break;
      //   }
      // }
      // const queryr = { estado: true, _id: rpps[i]._id};
      // await Usuario.replaceOne(queryr,rrppDb);
    // }
  // }
  // //CICLO PARA CALCULAR TOTAL DE TODO
  //   for(let i = 0;i<rpps.length;i++){
  //     totalRRPPComision = 0;
  //     const queryrppCom = { estado: true, rol : "RRPP", _id: rpps[i]._id};
  //     const rppsCom = await Usuario.findOne(queryrppCom);
  //     const querytar = { estado: true, rrpp:rpps[i]._id};
  //     const tar = await Usuario.find(querytar);
  //     const queryClienteGen = {estado:true, free:false,"usuarios.usuario": rpps[i]._id};
  //     const cli = await Cliente.find(queryClienteGen);
  //     let cantidadRRPP = 0;
  //     //ACUMULADOR DE SUMA DE ENTRADAS
  //     for(let p = 0;p<cli.length;p++){
  //       for(let j = 0;j<cli[p].entradas.length;j++){
  //         if(cli[p].entradas[j].evento==eventos[m]._id){
  //           if(cli[p].entradas[j].usuario==rpps[i]._id){
  //             cantidadRRPP = cantidadRRPP + 1;
  //             acuEntCliGen = acuEntCliGen + cli[p].entradas[j].importe;
  //           }
  //         }
  //       }
  //     }
  //     //TOTAL DE UN USUARIO RRPP INDIVIDUAL
  //     sumaRpp = rppsCom.comisionEnt*cantidadRRPP;
  //     //ACUMULADOR DE COMISION+SUMA INDI
  //     totalRRPPComision = totalRRPPComision+sumaRpp;
  //     for(let j = 0;j<tar.length;j++){
  //       sumaTar = 0;
  //       sumaTotalTarTo=0;
  //       const queryTarCom = { estado: true, rol : "TARJETERO", _id: tar[j]._id};
  //       const rppsTarCom = await Usuario.findOne(queryTarCom);
  //       const queryTar = {estado:true, free:false,"usuarios.usuario": tar[j]._id};
  //       //CANTIDAD DE CLIENTES DEL TARJETERO
  //       // const cliTar = await Cliente.countDocuments(queryTar);
  //       const cliTar = await Cliente.find(queryTar);
  //       let cantidadTar = 0;
  //       // for(let i = 0 ;i<cliTar.length;i++){

  //       //   cantidadTar = cantidadTar + cliTar[i].entradas.length;
  //       // }
  //       //ACUMULADOR DE SUMA DE ENTRADAS
  //       for(let i = 0;i<cliTar.length;i++){
  //         for(let u = 0;u<cliTar[i].entradas.length;u++){
  //           if(cliTar[i].entradas[u].evento==eventos[m]._id){
  //             if(cliTar[i].entradas[u].usuario==tar[j]._id){
  //               cantidadTar = cantidadTar + 1;
  //               acuEntCliGen = acuEntCliGen + cliTar[i].entradas[u].importe;
  //             }
  //           }
  //         }
  //       }
  //       //SUMA TOTAL DE GANANCIAS DE TARJETERO INDIVIDUAL
  //       sumaTar = rppsTarCom.comisionEnt*cantidadTar;
  //       // console.log("SUMA TARJETERO INDI",sumaTar);
  //       totalSumaRrpps = totalSumaRrpps+sumaTar;
  //       //SUMA TOTAL DE GANANCIA QUE LE QUEDA AL RRPP DE SUS TARJETEROS
  //       sumaTotalTarTo = sumaTotalTarTo+(rpps[i].comisionRRPP*cantidadTar);
  //       // console.log("SUMA COMISION TARJETERO PARA RRPP"+sumaTotalTarTo);
  //       //SUMA TOTAL DE GANANCIA DE COMISION MAS GANANCIA INDIVIDUAL DEL RRPP
  //       totalRRPPComision = totalRRPPComision + sumaTotalTarTo;
  //       // console.log("SUMA COMISION+INDI",totalRRPPComision);
  //       //GUARDANDO EN TARJETERO SU GANANCIA DE ESE EVENTO
  //       await Usuario.findOneAndUpdate(queryTarCom,{deuda:sumaTar});
  //     } 
  //     //GUARDANDO EN RRPP SU GANANCIA DE ESE EVENTO
  //     await Usuario.findOneAndUpdate(queryrppCom,{deuda:totalRRPPComision});
  //     totalSumaRrpps = totalSumaRrpps+totalRRPPComision;
  //     }
  // }
  res.json({ deutotal: totalSumaRrpps,totalentradas:acuEntCliGen});
};
const getDeudaByEventoByAdmin = async (req, res) => {
  const {idevento} = req.params;

  let acuEntCliGen=0;
  let totalSumaRrpps=0;
  //CICLO PARA ASIGNAR POR EVENTO LAS DEUDAS DE LOS RRPP Y TARJETEROS
  // for(let m = 0;m<eventos.length;m++){  
  const queryrpps = { estado: true, rol:"RRPP"};
  const rpps = await Usuario.find(queryrpps);
  for (let i = 0; i < rpps.length; i++) {
    for (let j = 0; j < rpps[i].eventos.length; j++) {
      if(rpps[i].eventos[j].evento===idevento){
        totalSumaRrpps = totalSumaRrpps+rpps[i].eventos[j].deuda;
        totalSumaRrpps = totalSumaRrpps+rpps[i].eventos[j].deudaComision;
        acuEntCliGen = acuEntCliGen+rpps[i].eventos[j].totalEntradas;
      }
    }
  }
  res.json({ deutotal: totalSumaRrpps,totalentradas:acuEntCliGen});
};
const getDeudaByAdminMasRapida = async (req, res) => {
  const queryevento = { estado: true};
  const eventos = await Evento.find(queryevento);
  let totalRRPPComision = 0;
  let sumaRpp = 0;
  let sumaTar = 0;
  let sumaTotalTarTo = 0;
  //CICLO PARA ASIGAR POR EVENTO LAS DEUDAS DE LOS RRPP Y TARJETEROS
  for(let m = 0;m<eventos.length;m++){  
    const queryrpps = { estado: true, rol : "RRPP","eventos.evento":eventos[m]._id};
    const rpps = await Usuario.find(queryrpps);
    for(let i = 0;i<rpps.length;i++){
      totalRRPPComision = 0;
      const queryrppCom = { estado: true, rol : "RRPP", _id: rpps[i]._id};
      const rppsCom = await Usuario.findOne(queryrppCom);
      const querytar = { estado: true, rrpp:rpps[i]._id,"eventos.evento":eventos[m]._id };
      const tar = await Usuario.find(querytar);
      const queryClienteGen = {estado:true, free:false,"usuarios.usuario": rpps[i]._id,"entradas.evento": eventos[m]._id.toString()};
      const cli = await Cliente.find(queryClienteGen);
      let cantidadRRPP = 0;
      for(let i = 0 ;i<cli.length;i++){
        cantidadRRPP = cantidadRRPP + cli[i].entradas.length;
      }
      //TOTAL DE UN USUARIO RRPP INDIVIDUAL
      sumaRpp = rppsCom.comisionEnt*cantidadRRPP;
      totalRRPPComision = totalRRPPComision+sumaRpp;
      for(let j = 0;j<tar.length;j++){
        sumaTar = 0;
        sumaTotalTarTo=0;
        const queryTarCom = { estado: true, rol : "TARJETERO", _id: tar[j]._id};
        const rppsTarCom = await Usuario.findOne(queryTarCom);
        const queryTar = {estado:true, free:false,"usuarios.usuario": tar[j]._id, "entradas.evento": eventos[m]._id.toString()};
        //CANTIDAD DE CLIENTES DEL TARJETERO
        const cliTar = await Cliente.countDocuments(queryTar);
        //SUMA TOTAL DE GANANCIAS DE TARJETERO INDIVIDUAL
        sumaTar = rppsTarCom.comisionEnt*cliTar;
        //SUMA TOTAL DE GANANCIA QUE LE QUEDA AL RRPP DE SUS TARJETEROS
        sumaTotalTarTo = sumaTotalTarTo+(rpps[i].comisionRRPP*cliTar);
        //SUMA TOTAL DE GANANCIA DE COMISION MAS GANANCIA INDIVIDUAL DEL RRPP
        totalRRPPComision = totalRRPPComision + sumaTotalTarTo;
        //GUARDANDO EN TARJETERO SU DEUDA DE ESE EVENTO
        const tarjeteroDb = await Usuario.findById(tar[j]._id);
        for(let i = 0;i<tarjeteroDb.eventos.length;i++){
          if(tarjeteroDb.eventos[i].evento==eventos[m]._id){
            tarjeteroDb.eventos[i].deuda = sumaTar;
            break;
          }
        }
        const query = { estado: true, _id: tar[j]._id};
        await Usuario.replaceOne(query,tarjeteroDb);
      } 
      const rrppDb = await Usuario.findById(rpps[i]._id);
      for(let i = 0;i<rrppDb.eventos.length;i++){
        if(rrppDb.eventos[i].evento==eventos[m]._id){
          rrppDb.eventos[i].deuda = totalRRPPComision;
          break;
        }
      }
      const queryr = { estado: true, _id: rpps[i]._id};
      await Usuario.replaceOne(queryr,rrppDb);
    }
  }
  //CICLO PARA CALCULAR TOTAL DE TODO
  const queryrpps = { estado: true, rol : "RRPP"};
  const rpps = await Usuario.find(queryrpps);
  let totalSumaRrpps=0;
  for(let i = 0;i<rpps.length;i++){
    totalRRPPComision = 0;
    const queryrppCom = { estado: true, rol : "RRPP", _id: rpps[i]._id};
    const promisesssss = Usuario.findOne(queryrppCom);
    const rppsCom = await Promise.all(promisesssss); 
    const querytar = { estado: true, rrpp:rpps[i]._id};
    const promisesss = Usuario.find(querytar);
    const tar = await Promise.all(promisesss); 
    const queryClienteGen = {estado:true, free:false,"usuarios.usuario": rpps[i]._id};
    const promisessss = Cliente.find(queryClienteGen);
    const cli = await Promise.all(promisessss); 
    let cantidadRRPP = 0;
    for(let i = 0 ;i<cli.length;i++){
       cantidadRRPP = cantidadRRPP + cli[i].entradas.length;
    }
    //TOTAL DE UN USUARIO RRPP INDIVIDUAL
    sumaRpp = rppsCom.comisionEnt*cantidadRRPP;
    //ACUMULADOR DE COMISION+SUMA INDI
    totalRRPPComision = totalRRPPComision+sumaRpp;
    for(let j = 0;j<tar.length;j++){
      sumaTar = 0;
      sumaTotalTarTo=0;
      const queryTarCom = { estado: true, rol : "TARJETERO", _id: tar[j]._id};
      const promisess = Usuario.findOne(queryTarCom);
      const rppsTarCom = await Promise.all(promisess);
      const queryTar = {estado:true, free:false,"usuarios.usuario": tar[j]._id};
      //CANTIDAD DE CLIENTES DEL TARJETERO
      // const cliTar = await Cliente.countDocuments(queryTar);
      const cliTar = await Cliente.find(queryTar);
      let cantidadTar = 0;
      for(let i = 0 ;i<cliTar.length;i++){
        cantidadTar = cantidadTar + cliTar[i].entradas.length;
      }
      //SUMA TOTAL DE GANANCIAS DE TARJETERO INDIVIDUAL
      sumaTar = rppsTarCom.comisionEnt*cantidadTar;
      // console.log("SUMA TARJETERO INDI",sumaTar);
      totalSumaRrpps = totalSumaRrpps+sumaTar;
      //SUMA TOTAL DE GANANCIA QUE LE QUEDA AL RRPP DE SUS TARJETEROS
      sumaTotalTarTo = sumaTotalTarTo+(rpps[i].comisionRRPP*cantidadTar);
      // console.log("SUMA COMISION TARJETERO PARA RRPP"+sumaTotalTarTo);
      //SUMA TOTAL DE GANANCIA DE COMISION MAS GANANCIA INDIVIDUAL DEL RRPP
      totalRRPPComision = totalRRPPComision + sumaTotalTarTo;
      // console.log("SUMA COMISION+INDI",totalRRPPComision);
      //GUARDANDO EN TARJETERO SU GANANCIA DE ESE EVENTO
      const promises = Usuario.findOneAndUpdate(queryTarCom,{deuda:sumaTar});
      await Promise.all(promises);
      
    } 
    //GUARDANDO EN RRPP SU GANANCIA DE ESE EVENTO
    const promises = Usuario.findOneAndUpdate(queryrppCom,{deuda:totalRRPPComision});
    await Promise.all(promises);
    totalSumaRrpps = totalSumaRrpps+totalRRPPComision;
    }
  res.json({ deutotal: totalSumaRrpps});
};
const getDeuGanByEvento = async (req, res) => {
  const {idevento} = req.params;
  const queryrpps = { estado: true, rol : {$ne:"ADMIN"}, "eventos.evento":idevento};
  const rpps = await Usuario.find(queryrpps);
  //GANANCIA POR PUERTA
  const ev = await Evento.findOne({_id:idevento});
  let GananciaPuerta = 0;
  if(ev){
    GananciaPuerta = ev.puerta*ev.clientesPuerta;
  }
  let acuEntCliGen=0;
  let acuDeuCliGen=0;

  for(let i = 0;i<rpps.length;i++){
    // acuEntCliGen=0;
    // const queryrppsop = { estado: true, rrpp:rpps[i]._id, "eventos.evento":idevento};
    // const rppsop = await Usuario.find(queryrppsop);
    const queryClienteGen = {estado:true, free:false,"usuarios.usuario": rpps[i]._id, "entradas.evento":idevento};
    const cantclienteGen = await Cliente.countDocuments(queryClienteGen);
    const sumclienteGen = await Cliente.find(queryClienteGen);
    for(let i = 0;i<sumclienteGen.length;i++){
      for(let j = 0;j<sumclienteGen[i].entradas.length;j++){
        if(sumclienteGen[i].entradas[j].evento===idevento){
          acuEntCliGen = acuEntCliGen + sumclienteGen[i].entradas[j].importe;
        }
      }
    }
    for (let k = 0; k < rpps[i].eventos.length; k++) {
      if(rpps[i].eventos[k].evento===idevento){
        if(rpps[i].eventos[k].rolEvento==="TARJETERO"){
          const rrppDb = await Usuario.findById(rpps[i].eventos[k].rrpp);
          for (let h = 0; h < rrppDb.eventos.length; h++) {
            if(rrppDb.eventos[h].evento===idevento){
              acuDeuCliGen = acuDeuCliGen+(cantclienteGen*rrppDb.eventos[h].comisionRRPP);
              
            }
          }
        }
        acuDeuCliGen = acuDeuCliGen+(cantclienteGen*rpps[i].eventos[k].comisionEnt);
        // console.log(acuDeuCliGen)
      }
    }
    
    // for(let j = 0;j<rppsop.length;j++){
    //   const queryOp = {estado:true, free:false,"usuarios.usuario": rppsop[j]._id,"entradas.evento":idevento};
    //   const cantclienteOp = await Cliente.countDocuments(queryOp);
    //   // const sumclienteOp = await Cliente.find(queryOp);
    //   // for(let i = 0;i<sumclienteOp.length;i++){
    //   //   for(let j = 0;j<sumclienteOp[i].entradas.length;j++){
    //   //     if(sumclienteOp[i].entradas[j].evento===idevento){
    //   //       acuEntCliGen = acuEntCliGen + sumclienteOp[i].entradas[j].importe;
    //   //     }
    //   //   }
    //   // }
    //   acuDeuCliGen = acuDeuCliGen+(cantclienteOp*rpps[i].comisionRRPP);
    // } 
  }
  res.json({ deutotal:acuDeuCliGen ,gantotal:acuEntCliGen, ganpuerta:GananciaPuerta});
};
const eliminarRpp = async (req, res) => {
  const { id } = req.params;
  //Fisicamente lo borramos
  //const Event = await Event.findByIdAndDelete(id);
  //Borrando con bandera
  try {
    const usuario = await Usuario.findById(id);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        msg: "El usuario no existe por ese id",
      });
    }
    // if (usuario.user._id.toString() !== req.uid) {
    //   return res.status(401).json({
    //     ok: false,
    //     msg: "No tiene privilegio de eliminar este usuario",
    //   });
    // }
    const usuarioDeleted = await Usuario.findByIdAndUpdate(
      id,
      { estado: false },
      { new: true }
    );
    res.json({
      ok: true,
      usuarioDeleted,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const eliminarRppEvento = async (req, res) => {
  const { uid, eid } = req.params;
  const query = { estado: true, _id: uid};
  try {
    const usuarioDb = await Usuario.findById({_id:uid});
    if(!usuarioDb){
      return res.status(400).json({
        msg: `El usuario no existe en el sistema`,
      });
    }
    const usuariosDelRRPP = await Usuario.find({estado:true,"eventos.rrpp":uid,"eventos.rolEvento":"TARJETERO"});
    for (let i = 0; i < usuariosDelRRPP.length; i++) {
      const eventosT = usuariosDelRRPP[i].eventos.filter((value)=>{ 
        return value.evento != eid;
      });
      usuariosDelRRPP[i].eventos = eventosT;
      await Usuario.replaceOne({_id:usuariosDelRRPP[i]._id}, usuariosDelRRPP[i]);
    }
    const eventosF = usuarioDb.eventos.filter((value)=>{ 
      return value.evento != eid;
    });
    usuarioDb.eventos = eventosF;
    
    const usuarioNuevo = await Usuario.replaceOne(query, usuarioDb);
    return res.status(201).json( usuarioNuevo );
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const getRppsBuscados = async (req, res) => {
  const {apellido,id} = req.params;
  // const usuario = await Usuario.findOne({estado:true,_id:id});
  const query = {estado: true, "apellido": { $regex: '.*' + apellido,$options:'i' + '.*' }, usuario:id};
  const [total, rpps] = await Promise.all([
    Usuario.countDocuments(query),
    Usuario.find(query)
      .populate("usuario", "nombre")
  ]);
  if(!rpps){
    return res.status(400).json({
      msg: `El rpp no tiene clientes ingresados aun`,
    });
  }
  res.json({ total, rpps });
};
const getAllRppsBuscados = async (req, res) => {
  const {apellido} = req.params;
  // const usuario = await Usuario.findOne({estado:true,_id:id});
  const query = {estado: true, "apellido": { $regex: '.*' +apellido,$options:'i'+ '.*' }};
  const [total, rpps] = await Promise.all([
    Usuario.countDocuments(query),
    Usuario.find(query)
      .populate("usuario", "nombre")
  ]);
  if(!rpps){
    return res.status(400).json({
      msg: `El rpp no tiene clientes ingresados aun`,
    });
  }
  res.json({ total, rpps });
};
const actualizarRrpp = async (req, res) => {
  const {dni, email, nombre, passwordShow, apellido} = req.body;
  try {
      const usuario = await Usuario.findOne({dni});
      if(!usuario){
        return res.status(400).json({
          ok: false,
          msg: "El cliente no existe",
        });
      }
      const salt = bcrypt.genSaltSync();
      const newPassword = bcrypt.hashSync(passwordShow.trim(), salt);
      const pass = newPassword.trim();
      const update = {dni, email, nombre, password:pass, passwordShow, apellido};
      const usuarioUpdate= await Usuario.findOneAndUpdate({dni},update,{new:true});
      return res.status(201).json({ ok:true, usuario: usuarioUpdate  });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        ok: false,
        msg: "Hable con el administrador",
      });
    }
};

module.exports = {
  crearUsuario,
  loginUsuario,
  revalidarToken,
  getRpps,
  asociarEventoRpp,
  getRppsByEvento,
  getRppsByGeneral,
  eliminarRpp,
  getGananciaByGeneral,
  getGananciaByOperativo,
  getDeudaByAdmin,
  desasociarEventoRpp,
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
  getGananciaTotalByOperativo
};
