import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },

    lease: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lease',
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    paymentMethod: {
      type: String,
      enum: ['cash', 'gcash', 'bank_transfer', 'paymongo'],
      required: true,
    },

    status: {
      type: String,
      enum: ['pending', 'paid', 'rejected'],
      default: 'pending',
    },

    reference: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
    },

    proof: {
      filename: { type: String, trim: true },
      contentType: { type: String, trim: true },
      data: { type: String },
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);