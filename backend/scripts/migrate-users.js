const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config({
  path: path.join(__dirname, '..', '.env')
});


const applyChanges = process.argv.includes('--apply');

function getMissingFields(user) {
  const missing = {};

  const accountType =
    user.role === 'admin'
      ? 'admin'
      : user.role === 'freelancer'
        ? 'student'
        : 'client';

  const defaults = {
    userType: accountType,
    activeRole: user.role || 'customer',
    studentId: '',
    isVerifiedStudent: false,
    isBanned: false,
    bio: '',
    reviewCount: 0
  };

  for (const [field, value] of Object.entries(defaults)) {
    if (!Object.prototype.hasOwnProperty.call(user, field)) {
      missing[field] = value;
    }
  }

  return missing;
}

async function migrateUsers() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing from backend/.env');
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log(
      applyChanges
        ? 'APPLY MODE: adding missing account fields.'
        : 'PREVIEW MODE: no database changes will be made.'
    );

    // Read raw documents so schema defaults do not hide missing fields.
    // Only fetch fields needed by this migration.
    const cursor = User.collection.find({}, {
      projection: {
        _id: 1,
        role: 1,
        userType: 1,
        activeRole: 1,
        studentId: 1,
        isVerifiedStudent: 1,
        isBanned: 1,
        bio: 1,
        reviewCount: 1
      }
    });

    let scanned = 0;
    let needingUpdate = 0;
    let fieldsAdded = 0;

    for await (const user of cursor) {
      scanned++;

      const missing = getMissingFields(user);
      const fields = Object.entries(missing);

      if (fields.length === 0) continue;

      needingUpdate++;

      console.log(
        `User ${user._id}: missing ${Object.keys(missing).join(', ')}`
      );

      if (applyChanges) {
        for (const [field, value] of fields) {
          // Update only if this field is still absent.
          const result = await User.collection.updateOne(
            {
              _id: user._id,
              [field]: { $exists: false }
            },
            {
              $set: { [field]: value }
            }
          );

          fieldsAdded += result.modifiedCount;
        }
      }
    }

    console.log(`Users scanned: ${scanned}`);
    console.log(`Users with missing fields: ${needingUpdate}`);

    if (applyChanges) {
      console.log(`Fields added: ${fieldsAdded}`);
    } else {
      console.log('Preview complete. No records were changed.');
    }
  } catch (error) {
    // Avoid printing connection strings or credentials.
    const safeMessage = String(error.message || 'Unknown error')
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, '[MongoDB URI hidden]');

    console.error('Migration failed:', safeMessage);
    console.error('Error code:', error.code || 'Not provided');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

migrateUsers();