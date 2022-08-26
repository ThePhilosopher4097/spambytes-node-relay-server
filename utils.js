const mongoose = require('mongoose');
const UserSchema = require('node-mongoose-auth/models/UserSchema');

exports.connectIfDisconnected =  async () => {
    // console.log(mongoose.connection.readyState);
    if(mongoose.connection.readyState != 1){
        console.log(mongoose.connection.readyState);
      await mongoose.connect('mongodb+srv://spambytes:spambytes@cluster0.viuzp9j.mongodb.net/dev?retryWrites=true&w=majority');
    }
  }

exports.handleError = (res, error) => {
    if(typeof error == 'string') return res.status(400).json({message : error});
    if(error.message){
        return res.status(400).json({message : error});
    }

    return res.status(400).json({message : "Oops, we encountered an error..."});
}

this.connectIfDisconnected();
exports.User = mongoose.model("User", UserSchema);