const mongoose = require("mongoose");

const dbConnection = async () => {
  try {
    await mongoose.connect(process.env.DB_CNN, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.log("Base de datos online");
  } catch (error) {
    throw new Error("Error a la hora de iniciar la base de datos");
  }
};
const dbConnectionLocal = async () => {
  try {
    await mongoose.connect(process.env.DB_LOCAL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.log("Base de datos local online");
  } catch (error) {
    throw new Error("Error a la hora de iniciar la base de datos local");
  }
};
//COMANDO PARA RETORNAR EL OBJETO CON VALOR ACTUALIZADO, Y NO EL VALOR ANTES DE ACTUALIZAR
//mongoose.set('returnOriginal', false);
module.exports = {
  dbConnection,
  dbConnectionLocal
};