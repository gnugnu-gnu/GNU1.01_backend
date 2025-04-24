require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const db = require('./src/config/db');

const bedsRouter = require('./src/routes/beds');
const cropsRouter = require('./src/routes/crops');
const todosRouter = require('./src/routes/todos');
const cropTypesRouter = require('./src/routes/cropTypes');

app.use(cors());
app.use(express.json());
app.use('/beds', bedsRouter);
app.use('/crops', cropsRouter);
app.use('/todos', todosRouter);
app.use('/crop-types', cropTypesRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});