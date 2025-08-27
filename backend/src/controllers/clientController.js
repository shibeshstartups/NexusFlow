import Client from '../models/Client.js';
import Project from '../models/Project.js';
import { AppError, catchAsync } from '../middleware/errorMiddleware.js';
import { logger } from '../utils/logger.js';

// Get all clients for current user
export const getClients = catchAsync(async (req, res, next) => {
  const { 
    page = 1, 
    limit = 50, 
    search, 
    status, 
    tags,
    sort = '-lastActivity' 
  } = req.query;

  const filters = { owner: req.user._id };
  const options = {
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
    sort: {}
  };

  // Parse sort parameter
  if (sort.startsWith('-')) {
    options.sort[sort.substring(1)] = -1;
  } else {
    options.sort[sort] = 1;
  }

  // Build filters
  if (status) filters.status = status;
  if (tags) filters.tags = { $in: Array.isArray(tags) ? tags : [tags] };
  if (search) {
    filters.$text = { $search: search };
  }

  const clients = await Client.find(filters)
    .populate('projectsCount')
    .populate('totalFilesCount')
    .sort(options.sort)
    .skip(options.skip)
    .limit(options.limit);

  const total = await Client.countDocuments(filters);

  res.status(200).json({
    success: true,
    data: {
      clients,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    }
  });
});

// Get single client
export const getClient = catchAsync(async (req, res, next) => {
  const client = await Client.findById(req.params.id)
    .populate('projectsCount')
    .populate('totalFilesCount');

  if (!client) {
    return next(new AppError('Client not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { client }
  });
});

// Create new client
export const createClient = catchAsync(async (req, res, next) => {
  const clientData = {
    ...req.body,
    owner: req.user._id
  };

  // Check if client with same email already exists for this user
  const existingClient = await Client.findOne({
    email: req.body.email,
    owner: req.user._id
  });

  if (existingClient) {
    return next(new AppError('Client with this email already exists', 400));
  }

  const client = await Client.create(clientData);

  logger.info(`Client created: ${client.name} by user ${req.user._id}`);

  res.status(201).json({
    success: true,
    message: 'Client created successfully',
    data: { client }
  });
});

// Update client
export const updateClient = catchAsync(async (req, res, next) => {
  const client = await Client.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  if (!client) {
    return next(new AppError('Client not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Client updated successfully',
    data: { client }
  });
});

// Delete client (soft delete)
export const deleteClient = catchAsync(async (req, res, next) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    return next(new AppError('Client not found', 404));
  }

  // Check if client has active projects
  const activeProjects = await Project.countDocuments({
    client: client._id,
    status: { $in: ['active', 'in_progress'] }
  });

  if (activeProjects > 0) {
    return next(new AppError('Cannot delete client with active projects', 400));
  }

  client.status = 'archived';
  await client.save();

  res.status(200).json({
    success: true,
    message: 'Client deleted successfully'
  });
});

// Get client projects
export const getClientProjects = catchAsync(async (req, res, next) => {
  const projects = await Project.find({
    client: req.params.id,
    owner: req.user._id
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: { projects }
  });
});

// Get client statistics
export const getClientStats = catchAsync(async (req, res, next) => {
  const clientId = req.params.id;

  const stats = await Project.aggregate([
    { $match: { client: mongoose.Types.ObjectId(clientId) } },
    {
      $group: {
        _id: null,
        totalProjects: { $sum: 1 },
        activeProjects: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        completedProjects: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalStorage: { $sum: '$metrics.totalSize' }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: { stats: stats[0] || {} }
  });
});

export default {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientProjects,
  getClientStats
};