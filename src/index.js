const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bedsRouter = require('./routes/beds');
const cropTypesRouter = require('./routes/cropTypes');
const cropsRouter = require('./routes/crops');
const todosRouter = require('./routes/todos');
const passwordProtect = require('./middleware/passwordProtect');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(passwordProtect); // 모든 요청에 패스워드 검증 적용
app.use('/beds', bedsRouter);
app.use('/crop-types', cropTypesRouter);
app.use('/crops', cropsRouter);
app.use('/todos', todosRouter);

mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
  app.listen(port, () => console.log(`Server running on port ${port}`));
}).catch(err => console.error('MongoDB connection error:', err));