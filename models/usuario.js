const { Schema, model, Number } = require('mongoose');

const UsuarioSchema = Schema({
    nombre: {
        type: String,
        required: true
    },
    apellido: {
        type: String,
        required: true
    },
    email: {
        type: String,
        //unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    passwordShow: {
        type: String,
    },
    rol: {
        type: String,
        required: true
    },
    estado: {
        type:Boolean,
        default:true,
        required: true
    },
    dni: {
        type: Number,
        required: true,
        unique: true
    },
    // ganancia: {
    //     type: Number,
    // },
    // deuda: {
    //     type: Number,
    // },
    // totalEntradas: {
    //     type: Number,
    // },
    // comisionEnt: {
    //     type: Number,
    // },
    // comisionRRPP: {
    //     type: Number,
    // },
    // evento: {
    //     type: Schema.Types.ObjectId,
    //     ref: "Evento",
    // },
    // rrpp: {
    //     type:String
    // },
    // maxFree: {
    //     type:Number
    // },
    eventos: [{
        evento: String,
        eventoNombre:String,
        deuda: Number,
        rolEvento:String,
        deudaComision: Number,
        cantFreeCargados:Number,
        totalEntradas:Number,
        maxFree:Number,
        rrpp:String,
        comisionEnt:Number,
        comisionRRPP:Number,
        rrppNombre:String
    }],
    // usuario: {
    //     type: Schema.Types.ObjectId,
    //     ref: "Usuario",
    // },
});
UsuarioSchema.methods.toJSON = function(){
    const {_id, password,...usuario} = this.toObject();
    usuario.uid=_id;
    return usuario;
}

module.exports = model('Usuario', UsuarioSchema );

