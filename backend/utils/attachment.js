import ApiError from './ApiError.js';

// Shared by any feature that lets a user attach a file inline as base64
// (Payment proof-of-payment, Message attachments) — no file storage
// service is provisioned for this project.
export const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

// `attachment` arrives as { filename, contentType, data } with `data` being
// raw base64 (no "data:" prefix) — the client reads the file with
// FileReader and strips that prefix before sending.
export const validateAttachment = (attachment) => {
  if (!attachment) return undefined;

  const { filename, contentType, data } = attachment;
  if (!filename || !contentType || !data) {
    throw new ApiError(400, 'Attachment is incomplete');
  }
  if (!ALLOWED_ATTACHMENT_TYPES.includes(contentType)) {
    throw new ApiError(400, 'Attachment must be a JPG, PNG, GIF, WEBP image, or PDF');
  }

  const approxBytes = Math.ceil((data.length * 3) / 4);
  if (approxBytes > MAX_ATTACHMENT_BYTES) {
    throw new ApiError(400, 'Attachment must be smaller than 4MB');
  }

  return { filename, contentType, data };
};
