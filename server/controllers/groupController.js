const Chat = require('../models/Chat');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const notify = require('../utils/notify');

const POPULATE_FIELDS = 'name email avatar isOnline lastSeen';

const emitGroupUpdate = (io, chat, event) => {
  if (!io) return;
  chat.participants.forEach((p) => io.to(`user:${p._id || p}`).emit(event, chat));
};

// @desc    Create a new group chat
// @route   POST /api/v1/groups
// @access  Private
exports.createGroup = catchAsync(async (req, res, next) => {
  const { groupName, memberIds } = req.body;

  if (!Array.isArray(memberIds) || memberIds.length < 2) {
    return next(new AppError('A group requires at least 2 other members.', 400));
  }

  const participants = Array.from(new Set([req.user.id, ...memberIds]));

  let chat = await Chat.create({
    isGroup: true,
    groupName,
    participants,
    groupAdmins: [req.user.id],
    createdBy: req.user.id,
  });

  chat = await chat.populate('participants', POPULATE_FIELDS);

  const io = req.app.get('io');
  memberIds.forEach((memberId) => {
    notify(io, {
      recipient: memberId,
      sender: req.user.id,
      type: 'group_invite',
      message: `${req.user.name} added you to "${groupName}".`,
      relatedId: chat._id,
    });
  });

  res.status(201).json({ status: 'success', data: { chat } });
});

// @desc    Rename a group (admin only)
// @route   PATCH /api/v1/groups/:chatId/rename
// @access  Private
exports.renameGroup = catchAsync(async (req, res, next) => {
  const { groupName } = req.body;
  const chat = await Chat.findOne({ _id: req.params.chatId, isGroup: true });

  if (!chat) return next(new AppError('Group not found.', 404));
  if (!chat.groupAdmins.some((a) => a.toString() === req.user.id)) {
    return next(new AppError('Only group admins can rename the group.', 403));
  }

  chat.groupName = groupName;
  await chat.save();
  const populated = await chat.populate('participants', POPULATE_FIELDS);

  emitGroupUpdate(req.app.get('io'), populated, 'groupUpdated');
  res.status(200).json({ status: 'success', data: { chat: populated } });
});

// @desc    Add members to a group (admin only)
// @route   PATCH /api/v1/groups/:chatId/add
// @access  Private
exports.addMembers = catchAsync(async (req, res, next) => {
  const { memberIds } = req.body;
  const chat = await Chat.findOne({ _id: req.params.chatId, isGroup: true });

  if (!chat) return next(new AppError('Group not found.', 404));
  if (!chat.groupAdmins.some((a) => a.toString() === req.user.id)) {
    return next(new AppError('Only group admins can add members.', 403));
  }

  chat.participants = Array.from(
    new Set([...chat.participants.map(String), ...memberIds])
  );
  await chat.save();
  const populated = await chat.populate('participants', POPULATE_FIELDS);

  emitGroupUpdate(req.app.get('io'), populated, 'groupUpdated');
  res.status(200).json({ status: 'success', data: { chat: populated } });
});

// @desc    Remove a member from a group (admin only)
// @route   PATCH /api/v1/groups/:chatId/remove/:userId
// @access  Private
exports.removeMember = catchAsync(async (req, res, next) => {
  const { chatId, userId } = req.params;
  const chat = await Chat.findOne({ _id: chatId, isGroup: true });

  if (!chat) return next(new AppError('Group not found.', 404));
  if (!chat.groupAdmins.some((a) => a.toString() === req.user.id)) {
    return next(new AppError('Only group admins can remove members.', 403));
  }

  chat.participants = chat.participants.filter((p) => p.toString() !== userId);
  chat.groupAdmins = chat.groupAdmins.filter((a) => a.toString() !== userId);
  await chat.save();

  const io = req.app.get('io');
  if (io) io.to(`user:${userId}`).emit('removedFromGroup', { chatId });

  const populated = await chat.populate('participants', POPULATE_FIELDS);
  emitGroupUpdate(io, populated, 'groupUpdated');
  res.status(200).json({ status: 'success', data: { chat: populated } });
});

// @desc    Promote a member to group admin (admin only)
// @route   PATCH /api/v1/groups/:chatId/promote/:userId
// @access  Private
exports.promoteToAdmin = catchAsync(async (req, res, next) => {
  const { chatId, userId } = req.params;
  const chat = await Chat.findOne({ _id: chatId, isGroup: true });

  if (!chat) return next(new AppError('Group not found.', 404));
  if (!chat.groupAdmins.some((a) => a.toString() === req.user.id)) {
    return next(new AppError('Only group admins can promote members.', 403));
  }
  if (!chat.participants.some((p) => p.toString() === userId)) {
    return next(new AppError('User is not a member of this group.', 400));
  }

  chat.groupAdmins.addToSet(userId);
  await chat.save();
  const populated = await chat.populate('participants', POPULATE_FIELDS);

  emitGroupUpdate(req.app.get('io'), populated, 'groupUpdated');
  res.status(200).json({ status: 'success', data: { chat: populated } });
});

// @desc    Leave a group
// @route   DELETE /api/v1/groups/:chatId/leave
// @access  Private
exports.leaveGroup = catchAsync(async (req, res, next) => {
  const chat = await Chat.findOne({ _id: req.params.chatId, isGroup: true });
  if (!chat) return next(new AppError('Group not found.', 404));

  chat.participants = chat.participants.filter((p) => p.toString() !== req.user.id);
  chat.groupAdmins = chat.groupAdmins.filter((a) => a.toString() !== req.user.id);

  // If the group has no admins left but still has members, promote the oldest remaining member
  if (chat.groupAdmins.length === 0 && chat.participants.length > 0) {
    chat.groupAdmins.push(chat.participants[0]);
  }

  await chat.save();

  const io = req.app.get('io');
  if (io) {
    chat.participants.forEach((p) =>
      io.to(`user:${p}`).emit('groupUpdated', chat)
    );
  }

  res.status(200).json({ status: 'success', message: 'You left the group.' });
});

// @desc    Delete a group entirely (creator only)
// @route   DELETE /api/v1/groups/:chatId
// @access  Private
exports.deleteGroup = catchAsync(async (req, res, next) => {
  const chat = await Chat.findOne({ _id: req.params.chatId, isGroup: true });
  if (!chat) return next(new AppError('Group not found.', 404));

  if (chat.createdBy.toString() !== req.user.id) {
    return next(new AppError('Only the group creator can delete the group.', 403));
  }

  const participantIds = chat.participants.map(String);
  await chat.deleteOne();

  const io = req.app.get('io');
  if (io) {
    participantIds.forEach((p) =>
      io.to(`user:${p}`).emit('groupDeleted', { chatId: chat._id })
    );
  }

  res.status(200).json({ status: 'success', message: 'Group deleted.' });
});
