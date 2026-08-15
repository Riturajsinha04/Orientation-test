import { Router } from 'express';
import {
  getTokens,
  getCurrentToken,
  getStats,
  createToken,
  callNext,
  updateTokenStatus,
  recallToken,
  resetSession,
} from '../controllers/tokenController.js';

const router = Router();

router.get('/tokens', getTokens);
router.get('/tokens/current', getCurrentToken);
router.get('/tokens/stats', getStats);
router.post('/tokens', createToken);
router.post('/tokens/call-next', callNext);
router.patch('/tokens/:tokenStr/status', updateTokenStatus);
router.post('/tokens/:tokenStr/recall', recallToken);
router.post('/session/reset', resetSession);

export default router;
