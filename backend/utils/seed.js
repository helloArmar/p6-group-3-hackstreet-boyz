import dns from "node:dns";
dns.setServers(['8.8.8.8', '8.8.4.4']);
import 'dotenv/config';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import Property from '../models/Property.js';
import Unit from '../models/Unit.js';
import Lease from '../models/Lease.js';
import Payment from '../models/Payment.js';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import Bill from '../models/Bill.js';

const PASSWORD = process.env.SEED_PASSWORD || 'ChangeMe123!';

const run = async () => {
  await connectDB();

  console.log('Clearing collections...');
  await Promise.all(
    [User, Tenant, Property, Unit, Lease, Payment, MaintenanceRequest, Bill].map((m) =>
      m.deleteMany({}),
    ),
  );

  console.log('Creating admin user...');
  // create() (not insertMany) so the password pre-save hook runs.
  await User.create({
    name: 'Amiel Robles',
    email: 'admin@rentease.com',
    password: PASSWORD,
    role: 'admin',
  });

  console.log('\nSeed complete.');
  console.log(`  admin    admin@rentease.com   / ${PASSWORD}`);
  console.log('\nChange these before deploying anywhere.\n');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
