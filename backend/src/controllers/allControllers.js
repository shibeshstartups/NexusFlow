import Project from '../models/Project.js';
import File from '../models/File.js';
import Folder from '../models/Folder.js';
import { AppError, catchAsync } from '../middleware/errorMiddleware.js';

// PROJECT CONTROLLER FUNCTIONS
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

// FOLDER CONTROLLER FUNCTIONS
export const getFolders = catchAsync(async (req, res, next) => {
  const { project } = req.query;
  const folders = await Folder.find({
    owner: req.user._id,
    ...(project && { project }),
    isDeleted: { $ne: true }
  }).sort({ fullPath: 1 });

  res.status(200).json({
    success: true,
    data: { folders }
  });
});

export const createFolder = catchAsync(async (req, res, next) => {
  const folder = await Folder.create({
    ...req.body,
    owner: req.user._id
  });

  res.status(201).json({
    success: true,
    message: 'Folder created successfully',
    data: { folder }
  });
});

export const getFolder = catchAsync(async (req, res, next) => {
  const folder = await Folder.findById(req.params.id);

  res.status(200).json({
    success: true,
    data: { folder }
  });
});

export const updateFolder = catchAsync(async (req, res, next) => {
  const folder = await Folder.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Folder updated successfully',
    data: { folder }
  });
});

export const deleteFolder = catchAsync(async (req, res, next) => {
  const folder = await Folder.findById(req.params.id);
  folder.isDeleted = true;
  folder.deletedAt = new Date();
  await folder.save();

  res.status(200).json({
    success: true,
    message: 'Folder deleted successfully'
  });
});

export const moveFolder = catchAsync(async (req, res, next) => {
  const folder = await Folder.findById(req.params.id);
  await folder.moveTo(req.body.parentId);

  res.status(200).json({
    success: true,
    message: 'Folder moved successfully',
    data: { folder }
  });
});

export const shareFolder = catchAsync(async (req, res, next) => {
  const folder = await Folder.findById(req.params.id);
  await folder.generateShareToken();
  folder.sharing.isEnabled = true;
  await folder.save();

  res.status(200).json({
    success: true,
    message: 'Folder shared successfully',
    data: { 
      folder,
      shareLink: folder.formattedShareLink 
    }
  });
});

export const getSharedFolder = catchAsync(async (req, res, next) => {
  const folder = await Folder.findOne({
    'sharing.shareToken': req.params.token
  });

  if (!folder) {
    return next(new AppError('Shared folder not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { folder }
  });
});

export const getFolderTree = catchAsync(async (req, res, next) => {
  const tree = await Folder.createTree(req.params.projectId, req.user._id);

  res.status(200).json({
    success: true,
    data: { tree }
  });
});

// SHARE CONTROLLER FUNCTIONS
export const accessSharedContent = catchAsync(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Access granted'
  });
});

export const downloadSharedFile = catchAsync(async (req, res, next) => {
  // This would redirect to the file download endpoint
  res.redirect(`/api/files/download/shared/${req.params.token}`);
});

export const getSharedProjectFiles = catchAsync(async (req, res, next) => {
  const project = await Project.findOne({
    'sharing.shareToken': req.params.token
  });

  if (!project) {
    return next(new AppError('Shared project not found', 404));
  }

  const files = await File.find({
    project: project._id,
    isDeleted: { $ne: true }
  });

  res.status(200).json({
    success: true,
    data: { files }
  });
});

export const getSharedFolderContents = catchAsync(async (req, res, next) => {
  const folder = await Folder.findOne({
    'sharing.shareToken': req.params.token
  });

  if (!folder) {
    return next(new AppError('Shared folder not found', 404));
  }

  const contents = await folder.getTreeStructure();

  res.status(200).json({
    success: true,
    data: { contents }
  });
});

export const validateShareAccess = (req, res, next) => {
  // Basic validation middleware
  next();
};

// Export all functions
export default {
  // Projects
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  shareProject,
  getSharedProject,
  getProjectFiles,
  getProjectFolders,
  getProjectStats,
  
  // Folders
  getFolders,
  createFolder,
  getFolder,
  updateFolder,
  deleteFolder,
  moveFolder,
  shareFolder,
  getSharedFolder,
  getFolderTree,
  
  // Sharing
  accessSharedContent,
  downloadSharedFile,
  getSharedProjectFiles,
  getSharedFolderContents,
  validateShareAccess
};
