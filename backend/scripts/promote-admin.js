const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

// Match the DNS workaround used by your existing Atlas connection.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const User = require('../models/User');

async function main() {
  try {
    const [emailArgument, ...options] = process.argv.slice(2);

    if (
      !emailArgument ||
      options.some((option) => option !== '--apply') ||
      options.length > 1
    ) {
      throw new Error(
        'Usage: node backend/scripts/promote-admin.js EMAIL [--apply]'
      );
    }

    const email = emailArgument.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Enter a valid account email.');
    }

    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing from backend/.env.');
    }

    await mongoose.connect(process.env.MONGO_URI, {
      family: 4,
      serverSelectionTimeoutMS: 10000,
    });

    const user = await User.findOne({ email })
      .select('name email role userType activeRole isBanned');

    if (!user) {
      throw new Error(
        'Account not found. Register the dedicated account first.'
      );
    }

    if (user.isBanned) {
      throw new Error(
        'This account is suspended. Resolve its suspension before promotion.'
      );
    }

    console.log(`Account: ${user.name} <${user.email}>`);
    console.log(`Current role: ${user.role}`);
    console.log(`Current account type: ${user.userType}`);

    if (
      user.role === 'admin' &&
      user.userType === 'admin' &&
      user.activeRole === 'admin'
    ) {
      console.log('This account is already configured as an administrator.');
      return;
    }

    if (!options.includes('--apply')) {
      console.log(
        'Preview only. No changes made. Add --apply to promote this account.'
      );
      return;
    }

    const result = await User.updateOne(
      {
        _id: user._id,
        isBanned: { $ne: true },
      },
      {
        $set: {
          role: 'admin',
          userType: 'admin',
          activeRole: 'admin',
        },
      },
      { runValidators: true }
    );

    if (result.matchedCount !== 1) {
      throw new Error('The account changed. Preview it again before retrying.');
    }

    console.log('Administrator access granted.');
    console.log('Log out and log in again to refresh the frontend session.');
  } catch (error) {
    // Avoid printing connection strings or database credentials.
    if (error.name === 'Error') {
      console.error(error.message);
    } else {
      console.error(`Admin setup failed (${error.name}).`);
      console.error('Check database connectivity and configuration.');
    }

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();