import express from 'express';
import { tryOnMakeup } from '../controllers/aiController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// רק משתמשים מחוברים יכולים להשתמש בסורק ה-AI
router.post('/try-on', protect, tryOnMakeup);

export default router;