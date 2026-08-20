const UserModel = require("../model/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * @name RegisterUserController
 * @route POST /api/auth/register
 * @description Register a new user, expects username, email, password in the request body
 * @access Public
 */
async function RegisterUserController(req, res) {
  const { username, email, password } = req.body;

  // Check required fields
  if (!username || !email || !password) {
    return res.status(400).json({
      message: "Please provide username, email and password",
    });
  }

  // Check if user already exists
  const isUserAlreadyExists = await UserModel.findOne({
    $or: [{ username }, { email }],
  });

  if (isUserAlreadyExists) {
    return res.status(400).json({
      message: "User already exists",
    });
  }

  // Hash password
  const hash = await bcrypt.hash(password, 10);

  // Create user
  const user = await UserModel.create({
    username,
    email,
    password: hash,
  });

  const token = jwt.sign(
    {
      id: user._Id,
      username: user.username,
    },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: "1d",
    },
  );

  req.cookie("token", token)

  res.status(201).json({
    message:"User registered successfully",
   user: {
    id: user._id,
    username: user.username,
    email: user.email
   }
  })
}

/**
 * @name LoginUserController
 * @route GET /api/auth/login
 * @description Login the user, expects email, password in the request body
 * @access Public
 */
async function LoginUserController(req,res) {

  const{email , password} = req.body

  const user = await UserModel.findOne({email})

  if (!user) {
    return res.status(400).json({
      message:"Invalid email or password"
    })
  }

  const isPasswordValid = bcrypt.compare(password, user.password)

  if (!isPasswordValid) {
    return res.status(400).json({
      message:"Invalid Password"
    })
  }

  const token = jwt.sign(
    {
      id: user._Id,
      username: user.username,
    },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: "1d",
    },
  );
  
  req.cookie("token", token);

    res.status(201).json({
      message: "User LoggedIN successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });

   
  
}
module.exports = { RegisterUserController, LoginUserController };
