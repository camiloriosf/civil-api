const express = require('express');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 8080;

const app = express();
app.enable('trust proxy');

app.use(bodyParser.json());

const server = app.listen(PORT).then(() => {
  console.log('Listening on port ' + PORT);
});
