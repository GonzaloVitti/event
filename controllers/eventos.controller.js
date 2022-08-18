const { Evento, Usuario, Cliente } = require("../models");
const bcrypt = require('bcrypt');

const getEventos = async (req, res) => {
  // const { limit = 5, from = 0 } = req.query;
  const query = { estado: true };

  const [total, eventos] = await Promise.all([
    Evento.countDocuments(query),
    Evento.find(query)
      .populate("usuario", "nombre")
  ]);
  res.json({ total, eventos });
};
const getEventosByRpp = async (req, res) => {
  const {idrpp} = req.params;
  const {eventos} = await Usuario.findById(idrpp);
  const eventoss = [];
  for (let i = 0; i < eventos.length; i++) {
    eventoss.push(eventos[i].evento);
  }
  const query = { estado: true, _id: eventoss};

  const [total, eventosRpp] = await Promise.all([
    Evento.countDocuments(query),
    Evento.find(query)
      .populate("usuario", "nombre")
  ]);
  res.json({ total, eventosRpp });
};
const getEvento = async (req, res) => {
  const { id } = req.params;
  try {
    const evento = await Evento.findById(id);
    if (!evento) {
      return res.status(400).json({
        msg: `El evento no existe`,
      });
    }
    return res.status(201).json({evento});
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const getClientePuerta = async (req, res) => {
  const { evento } = req.params;
  try {
    const {clientesPuerta} = await Evento.findOne({_id:evento});
    return res.status(200).json({cantidad:clientesPuerta});
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const setFinalizado = async(req,res)=>{
  const {evento} = req.body;
  const eventoDb = await Evento.findOne({_id:evento});
  if(eventoDb){
    try {
      await Evento.findOneAndUpdate({_id:evento},{finalizado:true});
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        ok: false,
        msg: "Hable con el administrador",
      });
    }
  }else{
    return res.status(500).json({
      ok: false,
      msg: "El evento no existe en el sistema",
    });
  }
}
const setAbierto = async(req,res)=>{
  const {evento} = req.body;
  const eventoDb = await Evento.findOne({_id:evento});
  if(eventoDb){
    try {
      await Evento.findOneAndUpdate({_id:evento},{finalizado:false});
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        ok: false,
        msg: "Hable con el administrador",
      });
    }
  }else{
    return res.status(500).json({
      ok: false,
      msg: "El evento no existe en el sistema",
    });
  }
}
const setHashPuerta = async(req,res)=>{
  const {evento} = req.params;
  const codigo = process.env.CODIGOQR+evento;
  const hash = bcrypt.hashSync(codigo,8);
  res.json({hash});
}
const agregarClientePuerta = async (req, res) => {
  const {evento} = req.body;
  const eventoDb = await Evento.findOne({_id:evento});
  if(eventoDb){
  try {
    await Evento.findOneAndUpdate({_id:evento},{clientesPuerta:eventoDb.clientesPuerta+1});
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
  }else{
      return res.status(500).json({
        ok: false,
        msg: "El evento no existe en el sistema",
      });
  }
  
};
const quitarClientePuerta = async (req, res) => {
  const {evento,pass,uid} = req.body;

  const usuario = await Usuario.findOne({ _id:uid });
  if (!usuario) {
    return res.status(400).json({
      ok: false,
      msg: "El usuario no existe con ese email",
    });
  }
  const validPassword = bcrypt.compareSync(pass, usuario.password);
  if (!validPassword) {
    return res.status(400).json({
       ok: false,
       msg: "Password incorrecto",
     });
  }
  const eventoDb = await Evento.findOne({_id:evento});
  if(eventoDb){
  try {
    await Evento.findOneAndUpdate({_id:evento},{clientesPuerta:eventoDb.clientesPuerta-1});
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
}else{
    return res.status(500).json({
      ok: false,
      msg: "El evento no existe en el sistema",
    });
}
  
};
const getPreciosByEvento = async (req, res) => {
  const { id } = req.params;
  try {
    const event = await Evento.findById(id);
    if (!event) {
      return res.status(400).json({
        msg: `El evento no existe`,
      });
    }
    let precios = {};
    if(event.vip!=undefined && event.preferencial!=undefined && event.general!=undefined){
      precios = {general:event.general,preferencial:event.preferencial,vip:event.vip};
    }
    return res.status(201).json(precios);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const crearEvento = async (req, res) => {
  const evento = new Evento(req.body);
  try {
    await evento.save();
    return res.status(201).json({ ok: true, evento });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
    });
  }
};
const actualizarEvento = async (req, res) => {
  const { id } = req.params;
  const { estado, nombre, ...data } = req.body;
  try {
    const event = await Evento.findById({_id: id});
    if (!event) {
      return res.status(404).json({
        ok: false,
        msg: "Evento no existe por ese id",
      });
    }
    // if (event.user._id.toString() !== req.uid) {
    //   return res.status(401).json({
    //     ok: false,
    //     msg: "No tiene privilegio de editar este evento",
    //   });
    // }
    const eventUpdate = await Evento.findByIdAndUpdate(id, data, {
      new: true,
    });
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
const eliminarEvento = async (req, res) => {
  const { id } = req.params;
  //Fisicamente lo borramos
  //const Event = await Event.findByIdAndDelete(id);
  //Borrando con bandera
  try {
    const evento = await Evento.findById(id);

    if (!evento) {
      return res.status(404).json({
        ok: false,
        msg: "Evento no existe por ese id",
      });
    }
    //CLIENTES
    const queryCli = {estado:true,"entradas.evento":evento._id};
    // const clientes = await Cliente.find(queryCli);
    // for (let i = 0; i < clientes.length; i++) {
    //   for (let j = 0; j < clientes[i].entradas.length; j++) {
    //     if(clientes[i].entradas[j].evento==evento._id){
    //       const usu = clientes[i].usuarios.filter(value=>{ 
    //         return value.evento !== evento._id.toString();
    //       });
    //       clientes[i].usuarios=usu;
    //       await Cliente.replaceOne({_id:clientes[i]._id}, clientes[i]);
    //     }
    //   }
    // }
    const updateClii = {$pull:{usuarios:{evento:evento._id}}};
    await Cliente.updateMany(queryCli,updateClii);
    const updateCli = {$pull:{entradas:{evento:evento._id}}};
    await Cliente.updateMany(queryCli,updateCli);
    //RRPPS
    const queryRrpp = {estado:true,"eventos.evento":evento._id};
    const updateRrpp = {$pull:{eventos:{evento:evento._id}}};
    await Usuario.updateMany(queryRrpp,updateRrpp);

    const eventDeleted = await Evento.findByIdAndUpdate(
      id,
      { estado: false },
      { new: true }
    );
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

module.exports = {
  getEventos,
  getEvento,
  eliminarEvento,
  actualizarEvento,
  crearEvento,
  getPreciosByEvento,
  getEventosByRpp,
  agregarClientePuerta,
  getClientePuerta,
  quitarClientePuerta,
  setHashPuerta,
  setFinalizado,
  setAbierto
};
