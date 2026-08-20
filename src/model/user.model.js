const mongoose = require('mongoose')
const UserSchema = new mongoose.Schema({
    username:{
        type: string,
        unique:[true , "Username Already Exists"],
        require: true
    },
    email:{
        type: string,
        unique:[true , "Account already exists by this email"],
        require: true
    },
    password:{
        type:string , 
        require: true,
    }
})

const UserModel = mongoose.model("users", UserSchema)

module.exports= UserModel