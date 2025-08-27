import Project from '../models/Project.js';
import File from '../models/File.js';
import { AppError, catchAsync } from '../middleware/errorMiddleware.js';

export const getProjects = catchAsync(async (req, res, next) => {
  const projects = await Project.find({ owner: req.user._id })
    .populate('client', 'name company')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: { projects }
  });
});

export const createProject = catchAsync(async (req, res, next) => {
  const project = await Project.create({
    ...req.body,
    owner: req.user._id
  });

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data: { project }
  });
});

export const getProject = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id)
    .populate('client', 'name company email');

  res.status(200).json({
    success: true,
    data: { project }
  });
});

export const updateProject = catchAsync(async (req, res, next) => {
  const project = await Project.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Project updated successfully',
    data: { project }
  });
});

export const deleteProject = catchAsync(async (req, res, next) => {
  await Project.findByIdAndUpdate(
    req.params.id,
    { status: 'archived' }
  );

  res.status(200).json({
    success: true,
    message: 'Project deleted successfully'
  });
});

export const shareProject = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id);
  await project.enableSharing(req.body);

  res.status(200).json({
    success: true,
    message: 'Project shared successfully',
    data: { 
      project,
      shareLink: project.formattedShareLink 
    }
  });
});

export const getSharedProject = catchAsync(async (req, res, next) => {
  const project = await Project.findOne({
    'sharing.shareToken': req.params.token
  }).populate('owner', 'name');

  if (!project) {
    return next(new AppError('Shared project not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { project }
  });
});

export const getProjectFiles = catchAsync(async (req, res, next) => {
  const files = await File.find({
    project: req.params.id,
    isDeleted: { $ne: true }
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: { files }
  });
});

export const getProjectFolders = catchAsync(async (req, res, next) => {
  const Folder = (await import('../models/Folder.js')).default;
  const folders = await Folder.createTree(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    data: { folders }
  });
});

export const getProjectStats = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id);
  await project.updateMetrics();

  res.status(200).json({
    success: true,
    data: { stats: project.metrics }
  });
});

export default {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  shareProject,
  getSharedProject,
  getProjectFiles,
  getProjectFolders,
  getProjectStats
};
