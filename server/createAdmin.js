
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = 'admin@onlineartgallery.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name: 'Gallery Admin',
          password: hashedPassword,
          role: 'admin',
          isActive: true,
        },
      },
      { new: true }
    );

    if (!admin) {
      await User.create({
        name: 'Gallery Admin',
        email,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      });
    }

    console.log('Admin account created/updated successfully!');
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
