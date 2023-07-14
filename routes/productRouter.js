import express from 'express';
import cloudinary from '../cloudinary.js';
import multer from 'multer'
import Product from '../model/productModel.js';
import { isAuth, isAdmin } from '../utils.js';

const router = express.Router();


        async function handleUpload(file) {
          const res = await cloudinary.uploader.upload(file, {
            resourse_type: "auto"
        });
        return res;

        }
        
        const storage = new multer.memoryStorage()
        const upload = multer({
          storage,
        })

        router.post('/images', upload.single("my_file"), async (req, res) => {
            const name = req.body.name
            const slug = req.body.slug
            const brand = req.body.brand
            const price = req.body.price
            const countInStock = req.body.countInStock
            const description = req.body.description
            const rating = req.body.rating
            const numReviews = req.body.numReviews
          try {
            const b64 = Buffer.from(req.file.buffer).toString("base64");
            let dataURI = "data:" + req.file.mimetype + ";base64," + b64
            const cldRes = await handleUpload(dataURI);
            if(cldRes){
              const product = new Product({
                    image: cldRes.secure_url,
                    name: name,
                    slug: slug,
                    brand: brand,
                    price: price,
                    countInStock: countInStock,
                    description: description,
                    rating: rating,
                    numReviews: numReviews 
                
        })
        const savedProducts = await product.save()
        res.status(200).send(savedProducts)
            }

          } catch (error) {
            console.log(error)

            
          }
        })


router.get('/getProduct', async(req, res) =>{
    try {
        const products = await Product.find({})
        res.status(200).send(products)
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }

})

// router.put( 
//   '/:id',
// async (req, res) => {
//     const productId = req.params.id;
//     const product = await Product.findById(productId);
//     if (product) {
//       product.image = req.body.image;
//       product.name = req.body.name;
//       product.slug = req.body.slug;
//       product.price = req.body.price;
//       product.brand = req.body.brand;
//       product.countInStock = req.body.countInStock;
//       product.description = req.body.description;
//       await product.save();
//       res.send({ message: 'Product Updated' });
//     } else {
//       res.status(404).send({ message: 'Product Not Found' });
//     }
//   }
// );
router.put('/:id', upload.single("my_file"), async (req, res) => {
  const productId = req.params.id;
  const product = await Product.findById(productId);

try {
  const b64 = Buffer.from(req.file.buffer).toString("base64");
  let dataURI = "data:" + req.file.mimetype + ";base64," + b64
  const cldRes = await handleUpload(dataURI);
  if(product){
    if(cldRes) {
      product.image = cldRes.secure_url,
      product.name = req.body.name;
      product.slug = req.body.slug;
      product.price = req.body.price;
      product.brand = req.body.brand;
      product.countInStock = req.body.countInStock;
      product.description = req.body.description; 
    }

      

 await product.save()
res.status(200).send({ message: 'Product Updated' })
  }

} catch (error) {
  console.log(error)

  
}
})

router.delete(
  '/:id',
async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
      await product.remove();
      res.send({ message: 'Product Deleted' });
    } else {
      res.status(404).send({ message: 'Product Not Found' });
    }
  })
;

router.post(
  '/:id/reviews',
   isAuth, async(req, res) => {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (product) {
      if (product.reviews.find((x) => x.name === req.user.name)) {
        return res
          .status(400)
          .send({ message: 'You already submitted a review' });
      }

      const review = {
        name: req.user.name,
        rating: Number(req.body.rating),
        comment: req.body.comment,
      };
      product.reviews.push(review);
      product.numReviews = product.reviews.length;
      product.rating =
        product.reviews.reduce((a, c) => c.rating + a, 0) /
        product.reviews.length;
      const updatedProduct = await product.save();
      res.status(201).send({
        message: 'Review Created',
        review: updatedProduct.reviews[updatedProduct.reviews.length - 1],
        numReviews: product.numReviews,
        rating: product.rating,
      });
    } else {
      res.status(404).send({ message: 'Product Not Found' });
    }
})

const PAGE_SIZE = 3;

router.get(
  '/search',
async (req, res) => {
    const { query } = req;
    const pageSize = query.pageSize || PAGE_SIZE;
    const page = query.page || 1;
    const category = query.category || '';
    const price = query.price || '';
    const rating = query.rating || '';
    const order = query.order || '';
    const searchQuery = query.query || '';

    const queryFilter =
      searchQuery && searchQuery !== 'all'
        ? {
            name: {
              $regex: searchQuery,
              $options: 'i',
            },
          }
        : {};
    const categoryFilter = category && category !== 'all' ? { category } : {};
    const ratingFilter =
      rating && rating !== 'all'
        ? {
            rating: {
              $gte: Number(rating),
            },
          }
        : {};
    const priceFilter =
      price && price !== 'all'
        ? {
            // 1-50
            price: {
              $gte: Number(price.split('-')[0]),
              $lte: Number(price.split('-')[1]),
            },
          }
        : {};
    const sortOrder =
      order === 'featured'
        ? { featured: -1 }
        : order === 'lowest'
        ? { price: 1 }
        : order === 'highest'
        ? { price: -1 }
        : order === 'toprated'
        ? { rating: -1 }
        : order === 'newest'
        ? { createdAt: -1 }
        : { _id: -1 };

    const products = await Product.find({
      ...queryFilter,
      ...categoryFilter,
      ...priceFilter,
      ...ratingFilter,
    })
      .sort(sortOrder)
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    const countProducts = await Product.countDocuments({
      ...queryFilter,
      ...categoryFilter,
      ...priceFilter,
      ...ratingFilter,
    });
    res.send({
      products,
      countProducts,
      page,
      pages: Math.ceil(countProducts / pageSize),
    });
  }
);

router.get(
  '/categories',
  async (req, res) => {
    const categories = await Product.find().distinct('category');
    res.send(categories);
  }
);

router.get('/slug/:slug', async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug });
    if (product) {
      res.send(product);
    } else {
      res.status(404).send({ message: 'Product Not Found' });
    }
  });


  router.get('/:id', async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.send(product);
    } else {
      res.status(404).send({ message: 'Product Not Found' });
    }
  });

export default router