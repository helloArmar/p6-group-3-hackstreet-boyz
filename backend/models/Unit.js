import mongoose from 'mongoose';

const unitSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },

    unitNumber: { type: String, required: [true, 'Unit number is required'], trim: true },

    // Added per the proposal ERD and the wireframe's units table.
    floor: { type: Number, min: 0, default: 1 },

    monthlyRent: { type: Number, required: [true, 'Monthly rent is required'], min: 0 },

    status: {
      type: String,
      enum: ['vacant', 'occupied'],
      default: 'vacant',
    },

    description: { type: String },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// "unique unit number per property" — from the proposal's acceptance criteria.
// Partial so soft-deleted units don't block reuse of their number.
unitSchema.index(
  { property: 1, unitNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

export default mongoose.model('Unit', unitSchema);
