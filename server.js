require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});
//connect to database
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const urlSchema = new mongoose.Schema({
  original: { type: String, required: true },
  short: Number
});

const Url = mongoose.model('Url', urlSchema);

function findByShort(number, callback) {
  return Url.findOne({ short: number }, callback);
}

async function findAndCreateByURL(find) {

  var lenght = await Url.countDocuments({}).exec();
  
  const doc = await Url.findOne(find);
  if(!doc) {
    const docCreate = {
      ...find,
      short: ++lenght
    }
    Url.create(docCreate);
    return docCreate;
  }
  return doc;
}

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl/new', (req, res) => {
  const { url } = req.body;
  if(!url) {
    return;
  }
  const filter = url.replace('https://', '').replace('http://', '');
  dns.lookup(filter, async (err, address, family) => {
    if(err && !err.hostname.includes('timestamp')) {
      return res.json({ error: 'invalid url'});
    }
    const doc = await findAndCreateByURL({ original: url });
    return res.json({
      original_url: doc.original,
      short_url: doc.short
    });

  });

});

app.get('/api/shorturl/:short', (req, res) => {
  const { short } = req.params;

  findByShort(short, (err, result) => {
    if(result) {
      res.redirect(result.original);
    } else {
      res.send('URL not Found');
    }
  });

});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
