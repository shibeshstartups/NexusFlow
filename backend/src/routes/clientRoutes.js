import express from 'express';
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientProjects,
  getClientStats
} from '../controllers/clientController.js';
import { protect, checkOwnership } from '../middleware/authMiddleware.js';
import { clientValidation } from '../middleware/validationMiddleware.js';
import Client from '../models/Client.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getClients)
  .post(clientValidation.create, createClient);

router.route('/:id')
  .get(checkOwnership(Client), getClient)
  .patch(checkOwnership(Client), clientValidation.update, updateClient)
  .delete(checkOwnership(Client), deleteClient);

// Client-related data
router.get('/:id/projects', checkOwnership(Client), getClientProjects);
router.get('/:id/stats', checkOwnership(Client), getClientStats);

export default router;