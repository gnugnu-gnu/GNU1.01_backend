const express = require('express');
const app = express();
const cors = require('cors');
const db = require('./config/db');

const bedsRouter = require('./routes/beds');
const cropsRouter = require('./routes/crops');
const todosRouter = require('./routes/todos');
const cropTypesRouter = require('./routes/cropTypes');

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