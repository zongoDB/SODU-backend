const admin = require('firebase-admin');
const functions = require('firebase-functions');

var GPS = require('gps');
var gps = new GPS;


admin.initializeApp(functions.config().firebase);

var db = admin.firestore();

/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 *                     More info: https://expressjs.com/en/api.html#req
 * @param {Object} res Cloud Function response context.
 *                     More info: https://expressjs.com/en/api.html#res
 */
exports.soduHttp = (req, res) => {
  gps_data = req.body.gps;
  seats = req.body.seats;
  number_plate = req.body.plate;
  owner_id = req.body.owner;

  gps.on('data', function(data){

    var data = {

    seats: req.body.seats,
    timestamp: admin.firestore.Timestamp.fromDate(data.time),
    geopoint: new admin.firestore.GeoPoint(data.lat,data.lon),

    }

    db.collection('users').doc(owner_id).collection('cars').doc(number_plate).update(data);
    res.send('ok');

  });
  gps.update(gps_data);
};