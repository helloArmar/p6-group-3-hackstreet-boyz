import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['admin', 'landlord', 'tenant'],
      required: true,
    },

    body: { type: String, trim: true },

    attachment: {
      filename: { type: String, trim: true },
      contentType: { type: String, trim: true },
      data: { type: String },
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messageSchema.pre('validate', function requireConversationAndContent() {
  if (!this.tenant && !this.landlord) {
    this.invalidate(
      'tenant',
      'Message must belong to a tenant or landlord conversation',
    );
  }
  if (this.tenant && this.landlord) {
    this.invalidate(
      'tenant',
      'Message cannot belong to both a tenant and a landlord conversation',
    );
  }
  if (!this.body && !this.attachment?.data) {
    this.invalidate('body', 'Message must have text or an attachment');
  }
});

messageSchema.index({ tenant: 1, createdAt: 1 });
messageSchema.index({ landlord: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);
