import Property from '../models/Property.js';
import Unit from '../models/Unit.js';
import Lease from '../models/Lease.js';
import Payment from '../models/Payment.js';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import asyncHandler from '../utils/asyncHandler.js';
import { propertyFilter, requireTenantProfile } from '../utils/scope.js';
import { startOfMonth, today, rentDueDate } from '../utils/rentDue.js';

// GET /api/dashboard/summary — all roles, shape varies by role
export const getSummary = asyncHandler(async (req, res) => {
  if (req.user.role === 'tenant') {
    const tenant = await requireTenantProfile(req.user);

    const [lease, paidThisMonth, openRequests] = await Promise.all([
      Lease.findOne({ tenant: tenant._id, status: 'active', isDeleted: false }).populate({
        path: 'unit',
        select: 'unitNumber',
        populate: { path: 'property', select: 'name' },
      }),
      Payment.aggregate([
        {
          $match: {
            tenant: tenant._id,
            status: 'paid',
            isDeleted: false,
            paymentDate: { $gte: startOfMonth() },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      MaintenanceRequest.countDocuments({
        tenant: tenant._id,
        isDeleted: false,
        status: { $ne: 'completed' },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        role: 'tenant',
        currentLease: lease,
        monthlyRent: lease?.monthlyRent ?? 0,
        paidThisMonth: paidThisMonth[0]?.total ?? 0,
        openRequests,
      },
    });
  }

  // admin + landlord
  const propertyIds = await Property.find({ isDeleted: false, ...propertyFilter(req.user) }).distinct(
    '_id',
  );

  const [totalProperties, totalUnits, occupiedUnits, revenueAgg, openRequests, activeLeases] =
    await Promise.all([
      propertyIds.length,
      Unit.countDocuments({ property: { $in: propertyIds }, isDeleted: false }),
      Unit.countDocuments({ property: { $in: propertyIds }, isDeleted: false, status: 'occupied' }),
      Payment.aggregate([
        { $match: { status: 'paid', isDeleted: false, paymentDate: { $gte: startOfMonth() } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      MaintenanceRequest.countDocuments({ isDeleted: false, status: { $ne: 'completed' } }),
      Lease.countDocuments({ status: 'active', isDeleted: false }),
    ]);

  res.status(200).json({
    success: true,
    data: {
      role: req.user.role,
      totalProperties,
      totalUnits,
      occupiedUnits,
      occupancyRate: totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
      monthlyRevenue: revenueAgg[0]?.total ?? 0,
      openRequests,
      activeLeases,
    },
  });
});

// GET /api/dashboard/rent-due — admin, landlord
// Powers the wireframe's "Rent Due This Week" table. A lease counts as paid when
// a payment has been recorded against it this calendar month.
export const getRentDue = asyncHandler(async (req, res) => {
  const propertyIds = await Property.find({ isDeleted: false, ...propertyFilter(req.user) }).distinct(
    '_id',
  );
  const unitIds = await Unit.find({ property: { $in: propertyIds }, isDeleted: false }).distinct('_id');

  const leases = await Lease.find({ unit: { $in: unitIds }, status: 'active', isDeleted: false })
    .populate('tenant', 'name')
    .populate({ path: 'unit', select: 'unitNumber', populate: { path: 'property', select: 'name' } })
    .lean();

  // Sum of what was actually paid this month, per lease — not every payment
  // matches the lease's rent exactly (partial payments, adjustments), so the
  // "paid" amount shown has to come from the Payment records, not lease.monthlyRent.
  const paidThisMonth = await Payment.aggregate([
    {
      $match: {
        lease: { $in: leases.map((l) => l._id) },
        status: 'paid',
        isDeleted: false,
        paymentDate: { $gte: startOfMonth() },
      },
    },
    { $group: { _id: '$lease', total: { $sum: '$amount' } } },
  ]);

  const paidByLease = new Map(paidThisMonth.map((p) => [String(p._id), p.total]));

  const rows = leases.map((lease) => {
    const paidAmount = paidByLease.get(String(lease._id));

    let status = 'due_soon';
    if (paidAmount !== undefined) status = 'paid';
    else if (today() > rentDueDate(lease.startDate)) status = 'overdue';

    return {
      leaseId: lease._id,
      tenant: lease.tenant?.name ?? '—',
      unit: lease.unit?.unitNumber ?? '—',
      property: lease.unit?.property?.name ?? '—',
      amount: paidAmount ?? lease.monthlyRent,
      status,
    };
  });

  res.status(200).json({ success: true, count: rows.length, data: rows });
});

// GET /api/dashboard/payment-stats — admin, landlord
export const getPaymentStats = asyncHandler(async (req, res) => {
  const propertyIds = await Property.find({ isDeleted: false, ...propertyFilter(req.user) }).distinct(
    '_id',
  );
  const unitIds = await Unit.find({ property: { $in: propertyIds }, isDeleted: false }).distinct('_id');
  const leases = await Lease.find({ unit: { $in: unitIds }, status: 'active', isDeleted: false }).lean();

  const collectedAgg = await Payment.aggregate([
    {
      $match: {
        lease: { $in: leases.map((l) => l._id) },
        status: 'paid',
        isDeleted: false,
        paymentDate: { $gte: startOfMonth() },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const paidLeaseIds = new Set(
    (
      await Payment.find({
        lease: { $in: leases.map((l) => l._id) },
        status: 'paid',
        isDeleted: false,
        paymentDate: { $gte: startOfMonth() },
      }).distinct('lease')
    ).map(String),
  );

  const unpaid = leases.filter((l) => !paidLeaseIds.has(String(l._id)));
  const overdueCount = unpaid.filter((l) => today() > rentDueDate(l.startDate)).length;

  res.status(200).json({
    success: true,
    data: {
      collected: collectedAgg[0]?.total ?? 0,
      outstanding: unpaid.reduce((sum, l) => sum + l.monthlyRent, 0),
      overdueCount,
    },
  });
});
