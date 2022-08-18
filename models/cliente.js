const { Schema, model, Number, Date, Array } = require('mongoose');

const ClienteSchema = Schema({
    nombre: {
        type: String,
        required: true
    },
    apellido: {
        type: String,
        required: true
    },
    estado: {
        type:Boolean,
        default:true,
        required: true
    },
    tipo: {
        type:String,
    },
    evento:{
        type:String
    },
    rol:{
        type:String,
        default:"CLIENTE"
    },
    free:{
        type:Boolean
    },
    ticket:{
        type:Boolean,
        default:false
    },
    esticket:{
        type:Boolean,
        default:false
    },
    ultComp:{
        type:String,
    },
    entradas:[{
        tipo:String,
        evento:String,
        importe: Number,
        usuario:String,
        nombre:String,
        ultComp:String,
        celular:String,
        rol:String,
        usuarioRRPP:String
    }],
    dni: {
        type: Number,
        required: true,
        unique: true
    },
    // cantidad: {
    //     type: Number
    // },
    celular: {
        type: Number,
        required: true,
    },
    fecha: {
        type: Date,
        required: true,
    },
    // usuario: {
    //     type: Schema.Types.ObjectId,
    //     ref: "Usuario",
    //     // required: true,
    // },
    usuarios:[{
        usuario:String,
        evento:String,
        apellido:String,
        nombre:String,
        rol:String,
        usuarioRRPP:String
    }],
    verificado:{
        type:Boolean,
        default:false,
        required: true
    },
    entrada:{
        type: Date,
        required: false,
    },
    salida:{
        type: Date,
        required: false,
    },
});
ClienteSchema.methods.toJSON = function(){
    const {_id,...cliente} = this.toObject();
    cliente.uid=_id;
    return cliente;
}

module.exports = model('Cliente', ClienteSchema );

