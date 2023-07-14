
import express from 'express'
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose'
import cors from'cors'
import userRouter from './routes/userRouter.js'
import cookieParser from'cookie-parser'
import productRouter from './routes/productRouter.js'
import orderRouter from './routes/orderRoutes.js';

dotenv.config()


const app = express()
app.use(express.json())
app.use(cookieParser())
app.use(cors())



app.use('/api/order', orderRouter)
app.use('/api/user', userRouter)
app.use("/api/product", productRouter)
// app.use('/images', express.static('images'))

const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, '/client-side/build')));
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, '/client-side/build/index.html'))
);



// connect to mongoDB
const URI = process.env.MONGODB_URL
mongoose.connect(URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
  .then(() => {
    console.log('connected to db');
  })
  .catch((err) => {
    console.log(err.message);
  });

// app.get('/',(req, res)=>{
//     res.json({msg:"welcome to home page"})
// })


const PORT = process.env.PORT || 8080
app.listen(PORT, () =>{
    console.log('server is running on port', PORT)
})