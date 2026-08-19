import cron from 'node-cron';
import Lease from '../models/Lease.js';
import Payment from '../models/Payment.js';
import { startOfMonth, today, rentDueDate } from './rentDue.js';
import { sendRentDueEmail } from './notifications.js';

const monthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

// Emails a tenant when their rent is due (or overdue) and not yet paid
// this month.
//
// The email is only recorded as sent when the SMTP email succeeds.
export const sendRentDueReminders = async () => {
  console.log('[rentReminders] Starting rent reminder sweep...');

  const leases = await Lease.find({
    status: 'active',
    isDeleted: false,
  })
    .populate('tenant', 'name email')
    .populate({
      path: 'unit',
      select: 'unitNumber',
      populate: {
        path: 'property',
        select: 'name',
      },
    });

  const currentMonth = monthKey(new Date());

  console.log(`[rentReminders] Found ${leases.length} active lease(s).`);

  for (const lease of leases) {
    try {
      // Already sent a reminder this month.
      if (lease.lastReminderMonth === currentMonth) {
        continue;
      }

      // Rent isn't due yet.
      const dueDate = rentDueDate(lease.startDate);

      if (today() < dueDate) {
        continue;
      }

      // Check if the tenant already paid this month.
      const paid = await Payment.exists({
        lease: lease._id,
        status: 'paid',
        isDeleted: false,
        paymentDate: {
          $gte: startOfMonth(),
        },
      });

      if (paid) {
        continue;
      }

      // Make sure the tenant has an email address.
      if (!lease.tenant?.email) {
        console.warn(
          `[rentReminders] Tenant has no email. Lease: ${lease._id}`,
        );

        continue;
      }

      const overdue = today() > dueDate;

      // IMPORTANT:
      // sendRentDueEmail should return true when the email
      // was successfully sent and false when it failed.
      const sent = await sendRentDueEmail({
        lease,
        overdue,
      });

      if (sent) {
        // Only record the reminder after successful email sending.
        lease.lastReminderMonth = currentMonth;

        await lease.save();

        console.log(`[rentReminders] Reminder sent for lease ${lease._id}`);
      } else {
        // Do NOT update lastReminderMonth.
        // This allows the next cron run to try again.
        console.error(
          `[rentReminders] Failed to send reminder for lease ${lease._id}`,
        );
      }
    } catch (error) {
      console.error(
        `[rentReminders] Error processing lease ${lease._id}:`,
        error,
      );
    }
  }

  console.log('[rentReminders] Rent reminder sweep finished.');
};

// Runs once a day at 09:00 Philippine time.
export const scheduleRentDueReminders = () => {
  cron.schedule(
    '0 9 * * *',
    async () => {
      console.log('[rentReminders] Cron triggered at 09:00 Asia/Manila.');

      try {
        await sendRentDueReminders();
      } catch (error) {
        console.error('[rentReminders] Sweep failed:', error);
      }
    },
    {
      timezone: 'Asia/Manila',
    },
  );

  console.log('[rentReminders] Cron scheduled for 09:00 Asia/Manila.');
};
