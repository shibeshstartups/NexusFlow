import Project from '../models/Project.js';
import File from '../models/File.js';
import Folder from '../models/Folder.js';
import { AppError, catchAsync } from '../middleware/errorMiddleware.js';

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

export default {
  accessSharedContent,
  downloadSharedFile,
  getSharedProjectFiles,
  getSharedFolderContents,
  validateShareAccess
};
