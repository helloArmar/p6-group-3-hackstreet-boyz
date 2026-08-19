import { sendMail } from './mailer.js';

export const sendMaintenanceCompletedEmail = async (request) => {
  const to = request.tenant?.email;

  if (!to) {
    console.warn(
      `[notification] No email found for tenant of maintenance request ${request._id}`,
    );

    return false;
  }

  const tenantName = request.tenant?.name ?? 'there';

  const unitLabel = request.unit?.unitNumber
    ? `Unit ${request.unit.unitNumber}`
    : 'your unit';

  const propertyName = request.unit?.property?.name;

  const sent = await sendMail({
    to,

    subject: `Maintenance request completed — ${request.title}`,

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>RentEase</h2>

        <p>Hi ${tenantName},</p>

        <p>
          Your maintenance request
          "<strong>${request.title}</strong>"
          for ${unitLabel}${propertyName ? `, ${propertyName}` : ''}
          has been marked
          <strong>completed</strong>.
        </p>

        <p>
          If the issue isn't fully resolved, please submit a new
          maintenance request or contact your property manager.
        </p>

        <p>
          — RentEase
        </p>
      </div>
    `,
  });

  if (!sent) {
    console.error(`[notification] Maintenance email failed for tenant ${to}`);
  }

  return sent;
};

export const sendRentDueEmail = async ({ lease, overdue }) => {
  const to = lease.tenant?.email;

  if (!to) {
    console.warn(
      `[notification] No email found for tenant of lease ${lease._id}`,
    );

    return false;
  }

  const tenantName = lease.tenant?.name ?? 'there';

  const unitLabel = lease.unit?.unitNumber
    ? `Unit ${lease.unit.unitNumber}`
    : 'your unit';

  const propertyName = lease.unit?.property?.name;

  const amount = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(lease.monthlyRent);

  const sent = await sendMail({
    to,

    subject: overdue ? 'Rent overdue — action needed' : 'Rent due reminder',

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>RentEase</h2>

        <p>Hi ${tenantName},</p>

        <p>
          This is a reminder that your rent of
          <strong>${amount}</strong>
          for ${unitLabel}${propertyName ? `, ${propertyName}` : ''}
          is
          <strong>${overdue ? 'overdue' : 'due'}</strong>.
        </p>

        <p>
          Please make a payment and submit your proof of payment
          through RentEase as soon as possible.
        </p>

        <p>
          — RentEase
        </p>
      </div>
    `,
  });

  if (!sent) {
    console.error(`[notification] Rent reminder failed for tenant ${to}`);
  }

  return sent;
};
