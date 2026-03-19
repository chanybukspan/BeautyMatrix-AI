import express from 'express';
import { 
    createOrder, 
    getAllOrders, 
    updateOrderStatus, 
    deleteOrder 
} from '../controllers/order.js';
import { protect, adminOnly } from '../middlewares/auth.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { orderSchema } from '../validators/orderValidator.js';

const router = express.Router();

// הגנה גורפת על כל הקובץ
router.use(protect);

// יצירת הזמנה וצפייה בהזמנות (למשתמש מחובר)
router.post('/', validate(orderSchema), createOrder);
router.get('/', getAllOrders);

// ביטול הזמנה (הלוגיקה ב-Controller בודקת אם זה האדמין או בעל ההזמנה)
router.delete('/:id', deleteOrder);

// עדכון סטטוס - אדמין בלבד
router.put('/:id/status', adminOnly, updateOrderStatus);

export default router;