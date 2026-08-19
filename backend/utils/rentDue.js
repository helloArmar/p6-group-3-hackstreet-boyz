// Rent is due by the 5th of each month — but a lease that started later
// than that (e.g. one signed today, mid-month) shouldn't be treated as
// overdue for a due date that fell before it even existed. Its first
// payment is only "due" as of its own start date. Compared by calendar
// day (not exact timestamp) so a lease isn't "overdue" hours after being
// created on its own due date.
export const DUE_DAY = 5;

export const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export const startOfDay = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const today = () => startOfDay(new Date());

export const rentDueDate = (leaseStartDate) => {
  const now = new Date();
  const monthDueDate = new Date(now.getFullYear(), now.getMonth(), DUE_DAY);
  const start = startOfDay(leaseStartDate);
  return start > monthDueDate ? start : monthDueDate;
};
