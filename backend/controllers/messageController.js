import Message from '../models/Message.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { validateAttachment } from '../utils/attachment.js';
import {
  resolveTenantConversation,
  resolveLandlordConversation,
} from '../utils/messageAuth.js';
import { getIO } from '../utils/socket.js';

export const getMessages = asyncHandler(async (req, res) => {
  const { tenant, landlord } = req.query;

  const filter = { isDeleted: false };
  if (tenant) {
    await resolveTenantConversation(req.user, tenant);
    filter.tenant = tenant;
  } else if (landlord) {
    await resolveLandlordConversation(req.user, landlord);
    filter.landlord = landlord;
  } else {
    throw new ApiError(400, 'tenant or landlord is required');
  }

  const messages = await Message.find(filter)
    .populate('sender', 'name role')
    .sort('createdAt');

  res
    .status(200)
    .json({ success: true, count: messages.length, data: messages });
});

export const getThreads = asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') {
    const landlords = await User.find({ role: 'landlord', isDeleted: false })
      .select('name email')
      .sort('name')
      .lean();

    const threads = await Promise.all(
      landlords.map(async (landlord) => {
        const last = await Message.findOne({
          landlord: landlord._id,
          isDeleted: false,
        })
          .sort('-createdAt')
          .select('body attachment senderRole createdAt')
          .lean();

        return {
          landlord,
          lastMessage: last
            ? {
                body: last.body,
                hasAttachment: Boolean(last.attachment?.data),
                senderRole: last.senderRole,
                createdAt: last.createdAt,
              }
            : null,
        };
      }),
    );

    threads.sort(
      (a, b) =>
        new Date(b.lastMessage?.createdAt ?? 0) -
        new Date(a.lastMessage?.createdAt ?? 0),
    );
    return res
      .status(200)
      .json({ success: true, count: threads.length, data: threads });
  }

  const tenants = await Tenant.find({
    landlord: req.user._id,
    isDeleted: false,
  })
    .select('name email')
    .sort('name')
    .lean();

  const threads = await Promise.all(
    tenants.map(async (tenant) => {
      const last = await Message.findOne({
        tenant: tenant._id,
        isDeleted: false,
      })
        .sort('-createdAt')
        .select('body attachment senderRole createdAt')
        .lean();

      return {
        tenant,
        lastMessage: last
          ? {
              body: last.body,
              hasAttachment: Boolean(last.attachment?.data),
              senderRole: last.senderRole,
              createdAt: last.createdAt,
            }
          : null,
      };
    }),
  );

  threads.sort(
    (a, b) =>
      new Date(b.lastMessage?.createdAt ?? 0) -
      new Date(a.lastMessage?.createdAt ?? 0),
  );
  res.status(200).json({ success: true, count: threads.length, data: threads });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { tenant, landlord, body, attachment } = req.body;

  if (tenant && landlord) {
    throw new ApiError(400, 'Message must target exactly one conversation');
  }

  let tenantDoc;
  if (tenant) {
    tenantDoc = await resolveTenantConversation(req.user, tenant);
  } else if (landlord) {
    await resolveLandlordConversation(req.user, landlord);
  } else {
    throw new ApiError(400, 'tenant or landlord is required');
  }

  const safeAttachment = validateAttachment(attachment);
  if (!body?.trim() && !safeAttachment) {
    throw new ApiError(400, 'Message must have text or an attachment');
  }

  const message = await Message.create({
    tenant: tenant || undefined,
    landlord: landlord || undefined,
    sender: req.user._id,
    senderRole: req.user.role,
    body: body?.trim(),
    attachment: safeAttachment,
  });

  await message.populate('sender', 'name role');

  const io = getIO();
  if (io) {
    if (tenant) {
      io.to(`tenant:${tenant}`).emit('message:new', message);
      if (tenantDoc.user)
        io.to(`user:${tenantDoc.user}`).emit('threads:updated');
      io.to(`user:${tenantDoc.landlord}`).emit('threads:updated');
    } else {
      io.to(`landlord:${landlord}`).emit('message:new', message);
      io.to(`user:${landlord}`).emit('threads:updated');
      io.to('role:admin').emit('threads:updated');
    }
  }

  res.status(201).json({ success: true, data: message });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findOne({
    _id: req.params.id,
    isDeleted: false,
  });
  if (!message) throw new ApiError(404, 'Message not found');

  if (
    req.user.role !== 'admin' &&
    String(message.sender) !== String(req.user._id)
  ) {
    throw new ApiError(403, 'You can only delete your own messages');
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  await message.save();

  res.status(200).json({ success: true, message: 'Message deleted' });
});
