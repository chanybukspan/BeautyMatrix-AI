import express from 'express';
import { 
    registerUser, 
    loginUser, 
    getAllUsers, 
    getCurrentUser 
} from "../controllers/user.js";
import { protect,adminOnly } from '../middlewares/auth.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { registerSchema, loginSchema } from '../validators/userValidator.js';

const router = express.Router();

// נתיבים ציבוריים
router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);

// מפה והלאה - כל הנתיבים דורשים התחברות (protect)
router.use(protect); 

router.get('/me', getCurrentUser);

// מפה והלאה - כל הנתיבים דורשים הרשאת אדמין
router.use(adminOnly);
router.get('/', getAllUsers);

export default router;