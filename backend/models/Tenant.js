import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    // The login account for this tenant. Optional: a manager can record a
    // walk-in tenant before that person has an account.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true,
    },

    // BUGFIX: this field previously carried unique:true, which capped the whole
    // system at one tenant per landlord. A landlord has many tenants.
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    name: { type: String, required: [true, 'Tenant name is required'], trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: [true, 'Phone is required'], trim: true },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Backs the ?q= search on GET /api/tenants
tenantSchema.index({ name: 'text', email: 'text' });

export default mongoose.model('Tenant', tenantSchema);
