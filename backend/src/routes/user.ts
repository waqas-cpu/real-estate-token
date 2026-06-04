import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/profile', optionalAuth, requireAuth, (req, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    role: req.headers['x-user-role'] ?? 'investor',
  });
});

export default router;
