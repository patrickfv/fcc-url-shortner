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
//callback - if pass invalid url
const dnsCallback = (resolve, reject) => (err, address) => {
  if(err) reject({ error: 'invalid url' });

  resolve({ address });
}
//Promise - 
function verifyURL(url) {
  url = url.replace('https://', '').replace('http://', '');
  return new Promise((resolve, reject) => {
    dns.lookup(url, dnsCallback(resolve, reject));
  });
}
/*
function formatURL(url) {
  if(url.includes('https://www.')) {
     return url;
  } else if(url.includes('www.')) {
    return `https://${url}`;
  } else if(url.includes('https://')) {
    return url.replace('https://', 'https://www.');
  } else {
    return `https://www.${url}`;
  }
}
*/
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
  /*
const doc = await Url.findOneAndUpdate(find, { short: ++lenght }, {
    'new': true,
    upsert: true
  })
    .sort(filter)
    .exec((err, result) => {
      console.log(err, result)
    });
  */
  return doc;
}

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl/new', bodyParser.urlencoded({ extended: false }), (req, res) => {
  const { url } = req.body;
  
  verifyURL(url)
    .then( async result => {
      const doc = await findAndCreateByURL({ original: url });
      
      res.json({
        original_url: doc.original,
        short_url: doc.short
      });
    })
    .catch( err => {
      res.json(err);
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
