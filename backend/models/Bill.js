import mongoose from 'mongoose';

// NOTE: not in the project proposal. Retained from the team's existing work.
// See BLOCKERS.md B-002 — the team needs to confirm whether this represents
// non-rent charges (utilities, association dues) or should be folded into Payment.
const billSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },

    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },

    status: {
      type: String,
      enum: ['unpaid', 'paid', 'overdue'],
      default: 'unpaid',
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model('Bill', billSchema);
