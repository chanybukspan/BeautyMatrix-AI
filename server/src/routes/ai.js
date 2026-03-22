import express from 'express';
import {tryOnProduct} from '../controllers/aiController.js'
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// רק משתמשים מחוברים יכולים להשתמש בסורק ה-AI
router.post('/try-on', protect, tryOnProduct);

export default router;