const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { error } = require("console");


// Backend: https://urban-muse-o8oh.vercel.app/

app.use(express.json());
app.use(cors());


// --------------------------deployment------------------------------

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// --------------------------deployment------------------------------


//Database Connect with MongoDB
mongoose.connect("mongodb+srv://Nikk3008:Nikk3008@cluster0.sb6nzrb.mongodb.net/webshop"/*, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }*/)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Error connecting to MongoDB:", err));



//Api Creation
app.get("/",(req,res)=>{
    res.send("Express App is Running")
})



// Image Storage Engine
const storage = multer.diskStorage({
    destination: './upload/images', // Adjust path if needed
    filename: (req, file, cb) => {
      cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    },
  });

const upload = multer({storage:storage})



//Creating Upload Endpoint for images
app.use('/images', express.static('upload/images'));

app.post("/upload", upload.single('product'), (req, res) => {
  const imageUrl = `http://localhost:${port}/images/${req.file.filename}`; // Adjust path if needed
  res.json({
    success: 1,
    image_url: imageUrl,
  });
});



// Error Handling (optional but recommended)
/*app.use((err, req, res, next) => {
    console.error(err.stack); // Log the error details
    res.status(500).json({ error: 'Internal server error' }); // Send generic error response
  });*/



//Schema for Creating Products
const Product = mongoose.model("Product",{
    id:{
        type: Number,
        required: true,
    },
    name:{
        type: String,
        required: true,
    },
    image:{
        type: String,
        required: true,
    },
    category:{
        type: String,
        required: true,
    },
    new_price:{
        type:Number,
        required: true,
    },
    old_price:{
        type:Number,
        required: true,
    },
    date:{
        type:Date,
        default: Date.now,
    },
    available:{
        type:Boolean,
        default: true,
    },
})



//Add product in database
app.post('/addproduct',async (req,res)=>{
    //To generate new product id everytime
    let products = await Product.find({});
    let id;
    if(products.length > 0){
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id+1;
    }
    else{
        id=1;
    }

    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success:true,
        name:req.body.name,
    })
})



//Creating API for deleting Products
app.post('/removeproduct',async (req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name
    })
})



//Creating API for getting all products
app.get('/allproducts', async (req,res)=>{
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})



//Schema creating for User Model
const Users = mongoose.model('Users',{
    name:{
        type: String,
    },
    email:{
        type: String,
        unique: true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
        default:{},
    },
    date:{
        type:Date,
        default:Date.now,
    }
})



//Creating Endpoint for regestring the user
app.post('/signup',async (req,res)=>{
    let check = await Users.findOne({email:req.body.email});
    if (check){
        return res.status(400).json({success:false,errors:"Existing User Found with same Email Address"})
    }
    let cart={};
    for (let i = 0; i < 300; i++) {
        cart[i]=0;
    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartDat:cart,
    })

    await user.save();

    const data = {
        user:{
            id:user.id
        }
    }

    const token = jwt.sign(data,'secret_ecom'/*salt encrypt data by one layer*/);
    res.json({success:true,token})
})


//Creating Endpoint for User Login
app.post('/login',async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if (user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else{
            res.json({success:false,errors:"Wrong Password"});
        }
    }
    else{
        res.json({success:false,errors:"Wrong Email Address"})
    }
})



//Creating API for newcollection data
app.get('/newcollection',async(req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(-8);
    console.log("New Collection Fetched");
    res.send(newcollection);
})



//Creating API for popular in wwomen 
app.get('/popularinwomen',async (req,res)=>{
    let products = await Product.find({category:"women"});
    let popular_in_women = products.slice(0,4);
    console.log("Popular in women fetched");
    res.send(popular_in_women);
})



//Creating Middleware to Fetch User
const fetchUser = async(req,res,next)=>{
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"});
    }
    else{
        try{
            const data = jwt.verify(token,'secret_ecom');
            req.user = data.user;
            next();
        } catch(error){
            res.status(401).send({errors:"Please authenticate using valid token"});
        }
    }
}



//Creating Endpoint for Adding Products in Cart
app.post('/addtocart',fetchUser,async(req,res)=>{
    //console.log(req.body,req.user);
    console.log("Added",req.body.itemId);
    userData = await Users.findOne({ _id: req.user.id });
    if (!userData.cartData) {
        userData.cartData = {};
    }
    await Users.updateOne(
        { _id: req.user.id },
        { $inc: { [`cartData.${req.body.itemId}`]: 1 } }
      );
    res.send("Added");
})



//Creating Endpoint to Remove Product from cart
app.post('/removefromcart',fetchUser,async(req,res)=>{
    console.log("Removed",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    //userData.cartData = userData.cartData || {};
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed")
})



//Creating Endpoint to get Retrieve Cart
app.post('/getcart',fetchUser,async(req,res)=>{
    console.log("GetCart");
    let userData = await Users.findOne({_id:req.user.id})
    res.json(userData.cartData);
})



//Start the Server
app.listen(port,(error)=>{
    if(!error){
        console.log("Server Running on Port " + port)
    }
    else{
        console.log("Error : " + error)
    }
})

