const mongoose = require('mongoose')
const UserSchema = new mongoose.Schema({
    username:{
        type: String,
        unique:[true , "Username Already Exists"],
        require: true
    },
    email:{
        type: String,
        unique:[true , "Account already exists by this email"],
        require: true
    },
    password:{
        type:String , 
        require: true,
    }
})

const UserModel = mongoose.model("users", UserSchema)

module.exports= UserModel