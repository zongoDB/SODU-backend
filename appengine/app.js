const express = require('express');
const app = express();

const admin = require('firebase-admin');
const functions = require('firebase-functions');

var GPS = require('gps');
var gps = new GPS;

var distanceMatrix = require('./distanceMatrix.js');
var seats = require('./seats.js')

admin.initializeApp(functions.config().firebase);
var db = admin.firestore();

function defaultContentTypeMiddleware (req, res, next) {
  req.headers['content-type'] = 'application/x-www-form-urlencoded';
  next();
}

app.use(defaultContentTypeMiddleware);
app.use(express.urlencoded());

app.post('/', async (req, res) => {
  
  try{

    gpsSentence = req.body.gps;
    seatMask = req.body.seat_mask;
    soduID = req.body.ID;

    console.log(gpsSentence+'\n'+ seatMask + '\n' + soduID);

    gpsPromise = new Promise(async (resolve, reject) => {
      setTimeout(()=>{
        reject(new Error("gps promise timed out"));
        throw new Error('gps promise timed out');
      }, 1000000);
    });

    gps.on('data', async (data)=>{
      gpsPromise = Promise.resolve(data);
    });
    gps.update(gpsSentence);

    gpsData = await gpsPromise;

    var newData = {

      seatMask: seatMask,
      timestamp: admin.firestore.Timestamp.fromDate(gpsData.time),
      location: new admin.firestore.GeoPoint(gpsData.lat,gpsData.lon),

    }

    soduDocSnapshot = await db.collection('sodus').doc(soduID).get();

    owner = soduDocSnapshot.get('owner');
    vehicle = soduDocSnapshot.get('vehicle');
    
    vehicleDocRef = db.collection('vehicles').doc(vehicle);
    vehicleDocSnapShot = await vehicleDocRef.get();
      
    oldLocation = vehicleDocSnapShot.get('location');
    oldSeatMask = vehicleDocSnapShot.get('seatMask');

    await vehicleDocRef.update(newData);
    await vehicleDocRef.collection('snapshots').doc().set(newData);
    // if(oldLocation === null || oldSeatMask === null){
    //   await vehicleDocRef.update(newData);
    //   await vehicleDocRef.collection('snapshots').doc().set(newData);
    // }
    // else{

    //   distance = await distanceMatrix
    //     .getDistance(gpsData.lat, gpsData.lon, oldLocation.latitude, oldLocation.longitude);

    //   /* if distance greater 350m (distance between hall 7 and conti roundabout) */
    //   if( distance >= 350 && oldSeatMask !== newData.seatMask ){
    //     await vehicleDocRef.update(newData);
    //     await vehicleDocRef.collection('snapshots').doc().set(newData);
    //   }
    // }

  }
  catch(error){
    console.log(error)
    res.sendStatus(500);
    return;
  }

  res.sendStatus(200);

});


// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});