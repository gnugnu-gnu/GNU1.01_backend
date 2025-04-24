require('dotenv').config();
const mongoose = require('mongoose');
const Bed = require('./models/Bed');

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB 연결 성공'))
  .catch(err => console.error('MongoDB 연결 오류:', err.message));

const initData = async () => {
  try {
    const bedCount = await Bed.countDocuments();
    if (bedCount === 0) {
      const beds = [
        ...[...Array(12)].map((_, i) => ({ name: `단베드 ${i + 1}` })),
        ...[...Array(9)].map((_, i) => ({ name: `장베드 ${i + 1}` }))
      ];
      await Bed.insertMany(beds);
      console.log('Initial Beds data inserted successfully');
    } else {
      console.log('Beds collection already initialized');
    }
  } catch (err) {
    console.error('Error initializing data:', err.message);
  } finally {
    mongoose.connection.close();
  }
};

initData();