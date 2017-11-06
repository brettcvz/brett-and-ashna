var express = require('express');
var app = express();

var google = require('googleapis');
var googleAuth = require('google-auth-library');
var auth = new googleAuth();
var oauth2Client = new auth.OAuth2(process.env.GDOCS_CLIENT_ID, process.env.GDOCS_CLIENT_SECRET, "http://brettandashna.com/api/authorize");
oauth2Client.credentials = JSON.parse(process.env.GDOCS_CREDENTIALS);
console.log("Credentials", oauth2Client.credentials);
var sheets = google.sheets('v4');

var RSVP_SHEET = process.env.GDOCS_RSVP_SHEET;

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
  extended: true,
}));

app.set('port', (process.env.PORT || 5000));
app.set('view engine', 'pug');
app.use(express.static(__dirname + '/public'));

var RSVP_DATA = [];
function loadRSVPData(cb) {
  sheets.spreadsheets.values.get({
    auth: oauth2Client,
    spreadsheetId: RSVP_SHEET,
    range: 'RSVPs!A2:G'
  }, function(err, response) {
    if (err) {
      return cb(err);
    }

    var rows = response.values;
    var data = rows.map(function(row, i) {
      return {
        name: row[0],
        code: row[1],
        additionalGuests: parseInt(row[2], 10),
        row: i
      };
    });
    cb(undefined, data);
  });
}

loadRSVPData(function(err, data){
  if (err) {
    console.error(err);
    // Fail hard on boot
    throw err;
  }

  RSVP_DATA = data;
});

app.get('/', function(req, res) {
  res.render('staging', {});
});

app.get('/preview', function(req, res) {
  res.render('index', {});
});

app.get('/api/refresh', function(req, res) {
  loadRSVPData(function(err, data) {
    if (err) {
      console.error(err);
      res.status(500);
      return res.send(err);
    }

    RSVP_DATA = data;
    return res.send("Success!");
  });
});

app.get('/api/guests', function(req, res) {
  var search = req.query.search;
  var items = [];
  if (search && search.length && search.length >= 5) {
    var lowerCase = search.toLowerCase();
    items = RSVP_DATA.filter(function(row) {
      return row.name.toLowerCase().indexOf(lowerCase) >= 0;
    });
  }

  return res.json({
    items: items,
    search: search
  });
});

app.post('/api/rsvp', function(req, res) {
  console.log(req.body);
  if (!req.body) { return res.status(400); }

  var rsvp = req.body.rsvp;
  var guestNames = req.body.guestNames;
  var groupTrip = req.body.groupTrip;
  var notes = req.body.notes;
  var code = req.body.code;
  var row = parseInt(req.body.row, 10) + 2; // Accounting for header, plus 0 -> 1 offset

  if (!rsvp || !row || !code) {
    return res.status(400).send("Missing data");
  }

  sheets.spreadsheets.values.get({
    auth: oauth2Client,
    spreadsheetId: RSVP_SHEET,
    range: 'RSVPs!A'+row+':G'+row
  }, function(err, response) {
    if (err) {
      console.error(err);
      return res.status(500).send("Error connecting to google");
    }

    var rows = response.values;
    if (rows.length === 0) {
      return res.status(400).send("Invalid row");
    }
    var trueCode = rows[0][1];
    if (code !== trueCode) {
      return res.status(400).send("Invalid code");
    }

    var entry = [ rsvp, guestNames, groupTrip, notes ];
    sheets.spreadsheets.values.update({
      auth: oauth2Client,
      spreadsheetId: RSVP_SHEET,
      range: 'RSVPs!D'+row+':G'+row,
      valueInputOption: "RAW",
      resource: { values: [ entry ] }
    }, function(err, response) {
      if (err) {
        console.error(err);
        return res.status(500).send("Error connecting to google");
      }

      res.send("Success");
    });
  });
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
