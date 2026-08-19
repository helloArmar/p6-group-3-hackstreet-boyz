import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    name: { type: String, required: [true, 'Property name is required'], trim: true },

    type: {
      type: String,
      enum: ['apartment', 'house', 'condo', 'bedspace', 'commercial'],
      required: [true, 'Property type is required'],
    },

    address: { type: String, required: [true, 'Address is required'], trim: true },

    // Added per the proposal ERD (Property: name, address, floors).
    floors: { type: Number, min: 1, default: 1 },

    description: { type: String },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

propertySchema.index({ name: 'text', address: 'text' });

propertySchema.virtual('units', {
  ref: 'Unit',
  localField: '_id',
  foreignField: 'property',
});

export default mongoose.model('Property', propertySchema);
