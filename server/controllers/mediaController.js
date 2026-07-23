const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { uploadBuffer, deleteAsset } = require('../services/cloudinaryService');
const { generateBlurhash } = require('../services/blurhashService');
const { getMediaType } = require('../middleware/upload');

// @desc    Upload/replace the current user's profile picture
// @route   POST /api/v1/media/avatar
// @access  Private
// @body    multipart/form-data, field name "avatar"
exports.uploadAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded. Use the "avatar" field.', 400));
  }
  if (!req.file.mimetype.startsWith('image/')) {
    return next(new AppError('Avatar must be an image file.', 400));
  }

  const result = await uploadBuffer(req.file.buffer, {
    folder: 'messenger-app/avatars',
    resourceType: 'image',
  });

  const user = await User.findById(req.user.id);

  // Clean up the old avatar in Cloudinary, if one was previously set
  if (user.avatar?.publicId) {
    await deleteAsset(user.avatar.publicId, 'image').catch(() => {});
  }

  user.avatar = { url: result.url, publicId: result.publicId };
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ status: 'success', data: { avatar: user.avatar } });
});

// @desc    Upload/replace a group's image (group admins only)
// @route   POST /api/v1/media/group/:chatId
// @access  Private
// @body    multipart/form-data, field name "groupImage"
exports.uploadGroupImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded. Use the "groupImage" field.', 400));
  }

  const chat = await Chat.findOne({ _id: req.params.chatId, isGroup: true });
  if (!chat) return next(new AppError('Group not found.', 404));
  if (!chat.groupAdmins.some((a) => a.toString() === req.user.id)) {
    return next(new AppError('Only group admins can change the group image.', 403));
  }

  const result = await uploadBuffer(req.file.buffer, {
    folder: 'messenger-app/groups',
    resourceType: 'image',
  });

  if (chat.groupImage?.publicId) {
    await deleteAsset(chat.groupImage.publicId, 'image').catch(() => {});
  }

  chat.groupImage = { url: result.url, publicId: result.publicId };
  await chat.save();

  const io = req.app.get('io');
  if (io) {
    chat.participants.forEach((p) => io.to(`user:${p}`).emit('groupUpdated', chat));
  }

  res.status(200).json({ status: 'success', data: { groupImage: chat.groupImage } });
});

// @desc    Upload a media file as a chat message (image/video/audio/document/voice note)
// @route   POST /api/v1/media/chat/:chatId
// @access  Private
// @body    multipart/form-data, field name "file"; optional text field "caption"
exports.uploadChatMedia = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const { caption, replyTo } = req.body;

  if (!req.file) {
    return next(new AppError('No file uploaded. Use the "file" field.', 400));
  }

  const chat = await Chat.findOne({ _id: chatId, participants: req.user.id });
  if (!chat) {
    return next(new AppError('Chat not found or you are not a participant.', 404));
  }

  const mediaType = getMediaType(req.file.mimetype);
  const resourceType = mediaType === 'video' ? 'video' : mediaType === 'image' ? 'image' : 'raw';

  const [result, blurhashData] = await Promise.all([
    uploadBuffer(req.file.buffer, {
      folder: `messenger-app/chat-media/${chatId}`,
      resourceType,
    }),
    mediaType === 'image' ? generateBlurhash(req.file.buffer) : Promise.resolve(null),
  ]);

  const message = await Message.create({
    chat: chatId,
    sender: req.user.id,
    content: caption?.trim() || null,
    replyTo: replyTo || null,
    media: {
      url: result.url,
      publicId: result.publicId,
      type: mediaType,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      ...(blurhashData && {
        blurhash: blurhashData.blurhash,
        width: blurhashData.width,
        height: blurhashData.height,
      }),
    },
    deliveredTo: [req.user.id],
    readBy: [req.user.id],
  });

  chat.lastMessage = message._id;
  await chat.save();

  const populated = await message.populate('sender', 'name avatar');

  const io = req.app.get('io');
  if (io) {
    chat.participants
      .filter((p) => p.toString() !== req.user.id)
      .forEach((p) => io.to(`user:${p}`).emit('message', populated));
    io.to(`chat:${chatId}`).emit('message', populated);
  }

  res.status(201).json({ status: 'success', data: { message: populated } });
});
