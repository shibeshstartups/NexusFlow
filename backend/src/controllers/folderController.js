import Folder from '../models/Folder.js';
import { AppError, catchAsync } from '../middleware/errorMiddleware.js';

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

export default {
  getFolders,
  createFolder,
  getFolder,
  updateFolder,
  deleteFolder,
  moveFolder,
  shareFolder,
  getSharedFolder,
  getFolderTree
};
