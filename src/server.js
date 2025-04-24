const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;
app.listen(port, () => {
   console.log(`Server running on port ${port}`);
});

const bedsRouter = require('./routes/beds');
const cropsRouter = require('./routes/crops');
const todosRouter = require('./routes/todos');
const cropTypesRouter = require('./routes/cropTypes');

// 라우터 타입 확인
console.log('bedsRouter:', typeof bedsRouter, bedsRouter);
console.log('cropsRouter:', typeof cropsRouter, cropsRouter);
console.log('todosRouter:', typeof todosRouter, todosRouter);
console.log('cropTypesRouter:', typeof cropTypesRouter, cropTypesRouter);

app.use(cors());
app.use(express.json());
app.use('/beds', bedsRouter);
app.use('/crops', cropsRouter);
app.use('/todos', todosRouter);
app.use('/crop-types', cropTypesRouter);

app.listen(3000, () => {
    console.log('Server running on port 3000');
});