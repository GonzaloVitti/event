const { Schema, model } = require("mongoose");

const EventoSchema = Schema({
  nombre: {
    type: String,
    required: true,
  },
  ubicacion: {
    type: String,
    required:true
  },
  fecha: {
    type: Date,
    required: true,
  },
  estado:{
    type:Boolean,
    default:true,
    required:true
  },
  vip:{
    type:Number,
    required:true
  },
  puerta:{
    type:Number,
    required:true
  },
  general:{
    type:Number,
    required:true
  },
  preferencial:{
    type:Number,
    required:true
  },
  usuario: {
    type: Schema.Types.ObjectId,
    ref: "Usuario",
    required: true,
  },
  clientesPuerta:{
    type:Number,
    default:0,
  },
  ticketGen:{
    type:Number,
    default:0,
  },
  finalizado:{
    type:Boolean,
    default:false,
  },
});
EventoSchema.methods.toJSON = function(){
    const {__v,state,_id,...data} = this.toObject();
    data.id=_id;
    return data;
}
module.exports = model("Evento", EventoSchema);
