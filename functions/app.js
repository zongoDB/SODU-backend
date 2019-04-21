const admin = require('firebase-admin');
const functions = require('firebase-functions');

var GPS = require('gps');
var gps = new GPS;

var rp = require('request-promise');
disatnceMatrixAPIKey = 'AIzaSyDvcgX93U8CFCp3Bn6_y8U-Q1e1EFbcPko';

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
  
  gpsSentence = req.body.gps;
  seatMask = parseInt(req.body.seat_mask, 10);
  soduID = req.body.ID;

  resStatus = 200;

  if( gpsSentence == null || seatMask == null || soduID == null){
    res.sendStatus(500);
    return;
  }

  gpsPromise = new Promise(async (resolve, reject) => {
    setTimeout(function(){
      reject("Timeout");
    }, 1000000);
  });

  gps.on('data', async function(data){
    gpsPromise = Promise.resolve(data);
  });
  gps.update(gpsSentence);

  gpsData = await gpsPromise
    .catch( (error) => {
      console.log(error);
      resStatus = 500;
    });

  var newData = {

    seatMask: seatMask,
    timeStamp: admin.firestore.Timestamp.fromDate(gpsData.time),
    location: new admin.firestore.GeoPoint(gpsData.lat,gpsData.lon),

  }

  soduDocSnapshot = await db.collection('sodus').doc(soduID).get()
    .catch( (error) => {
      console.log(error);
      resStatus = 500;
    });

  owner = soduDocSnapshot.get('owner');
  vehicle = soduDocSnapshot.get('vehicle');
   
  vehicleDocRef = db.collection('vehicles').doc(vehicle);
  vehicleDocSnapShot = await vehicleDocRef.get()
    .catch( (error) => {
      console.log(error);
      resStatus = 500;
    });
    
  oldLocation = vehicleDocSnapShot.get('location');
  oldSeatMask = vehicleDocSnapShot.get('seatMask');

  if(oldLocation == null || oldSeatMask == null){

    await vehicleDocRef.update(newData)
      .catch( (error) => {
        console.log(error);
        resStatus = 500;
      });

    await vehicleDocRef.collection('snapshots').doc().set(newData)
      .catch( (error) => {
        console.log(error);
        resStatus = 500;
      });
  }
  else{

    var options = {
      uri: 'https://maps.googleapis.com/maps/api/distancematrix/json',
      qs: {
        origins: gpsData.lat + ',' + gpsData.lon,
        destinations: oldLocation.latitude + ','+ oldLocation.longitude,
        mode: 'driving',
        language: 'en',
        key: disatnceMatrixAPIKey
      },
      json: true // Automatically parses the JSON string in the response
    };
     
    distanceMatrixResponse = await rp(options)
      .catch( (error) => {
        console.log(error);
        resStatus = 500;
      });

    distanceMatrixElement = distanceMatrixResponse.rows[0].elements[0];

    if( distanceMatrixElement.status == 'OK'){

      distance = distanceMatrixElement.distance.value;
      /* if distance greater 350m (distance between hall 7 and conti roundabout) */
      if( distance >= 350 && oldSeatMask != newData.seatMask ){
        await vehicleDocRef.update(newData)
          .catch( (error) => {
            console.log(error);
            resStatus = 500;
          });

        await vehicleDocRef.collection('snapshots').doc().set(newData)
          .catch( (error) => {
            console.log(error);
            resStatus = 500;
          });
      }
    }
    else{
      resStatus = 500;
    }

  }

  res.sendStatus(resStatus);

});