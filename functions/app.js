const admin = require('firebase-admin');
const functions = require('firebase-functions');

var GPS = require('gps');
var gps = new GPS;

var distanceMatrix = require('./distanceMatrix.js');

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
exports.soduHttp = functions.https.onRequest(async (req, res) => {
  
  try{

    gpsSentence = req.body.gps;
    seatMask = parseInt(req.body.seat_mask, 10);
    soduID = req.body.ID;

    gpsPromise = new Promise(async (resolve, reject) => {
      setTimeout(function(){
        reject("Timeout");
        throw new Error('gps promise timed out');
      }, 1000000);
    });

    gps.on('data', async function(data){
      gpsPromise = Promise.resolve(data);
    });
    gps.update(gpsSentence);

    gpsData = await gpsPromise;

    var newData = {

      seatMask: seatMask,
      timeStamp: admin.firestore.Timestamp.fromDate(gpsData.time),
      location: new admin.firestore.GeoPoint(gpsData.lat,gpsData.lon),

    }

    soduDocSnapshot = await db.collection('sodus').doc(soduID).get();

    owner = soduDocSnapshot.get('owner');
    vehicle = soduDocSnapshot.get('vehicle');
    
    vehicleDocRef = db.collection('vehicles').doc(vehicle);
    vehicleDocSnapShot = await vehicleDocRef.get();
      
    oldLocation = vehicleDocSnapShot.get('location');
    oldSeatMask = vehicleDocSnapShot.get('seatMask');

    if(oldLocation == null || oldSeatMask == null){
      await vehicleDocRef.update(newData);
      await vehicleDocRef.collection('snapshots').doc().set(newData);
    }
    else{

      distance = await distanceMatrix
        .getDistance(gpsData.lat, gpsData.lon, oldLocation.latitude, oldLocation.longitude);

      /* if distance greater 350m (distance between hall 7 and conti roundabout) */
      if( distance >= 350 && oldSeatMask != newData.seatMask ){
        await vehicleDocRef.update(newData);
        await vehicleDocRef.collection('snapshots').doc().set(newData);
      }
    }

  }
  catch(error){
    console.log(error)
    res.sendStatus(500);
    return;
  }

  res.sendStatus(200);

});