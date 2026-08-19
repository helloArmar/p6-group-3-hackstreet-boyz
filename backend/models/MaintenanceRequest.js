import mongoose from 'mongoose';

const maintenanceRequestSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },

    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },

    status: {
      type: String,
      enum: ['pending', 'assigned', 'in_progress', 'completed'],
      default: 'pending',
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },

    assignedTo: { type: String, trim: true },
    dateSubmitted: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model('MaintenanceRequest', maintenanceRequestSchema);
