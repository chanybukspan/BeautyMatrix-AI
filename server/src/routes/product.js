import express from 'express';
import { 
    getAllProducts, 
    getProductById, 
    addProduct, 
    updateProduct, 
    deleteById 
} from '../controllers/product.js';
import { protect,adminOnly } from '../middlewares/auth.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { productSchema } from '../validators/productValidator.js';

const router = express.Router();

// נתיבים פתוחים לקהל הרחב
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// מפה והלאה - הגנה על שינויים (דורש אדמין מחובר)
router.use(protect);
router.use(adminOnly);

router.post('/', validate(productSchema), addProduct);
router.put('/:id', validate(productSchema), updateProduct);
router.delete('/:id', deleteById);

export default router;