import mongoose from 'mongoose';

const leaseSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },

    startDate: { type: Date, required: [true, 'Start date is required'] },
    endDate: { type: Date, required: [true, 'End date is required'] },

    monthlyRent: { type: Number, required: true, min: 0 },
    securityDeposit: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['active', 'expired', 'terminated'],
      default: 'active',
    },

    terminatedAt: { type: Date, default: null },

    // "YYYY-MM" of the last calendar month a rent-due reminder email was
    // sent for, so the daily cron sweep emails a tenant at most once per
    // month instead of nagging them every day it stays unpaid.
    lastReminderMonth: { type: String, default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

leaseSchema.pre('validate', function checkDates() {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
});

export default mongoose.model('Lease', leaseSchema);
