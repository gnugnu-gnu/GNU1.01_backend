const mongoose = require('mongoose');
const Bed = require('./models/Bed');

const mongoUrl = process.env.MONGO_URL || 'mongodb+srv://greenhouse_user:yourpassword@cluster0.mongodb.net/greenhouse?retryWrites=true&w=majority';

mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB 연결 성공'))
  .catch(err => console.error('MongoDB 연결 오류:', err.message));

const initData = async () => {
  try {
    // Beds 컬렉션 초기화
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