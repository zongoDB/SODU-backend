const admin = require('firebase-admin');
const functions = require('firebase-functions');

var GPS = require('gps');
var gps = new GPS;

var distanceMatrix = require('./distanceMatrix.js');
var seats = require('./seats.js')

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
    if(oldLocation === null || oldSeatMask === null){
      await vehicleDocRef.update(newData);
      await vehicleDocRef.collection('snapshots').doc().set(newData);
    }
    else{

      distance = await distanceMatrix
        .getDistance(gpsData.lat, gpsData.lon, oldLocation.latitude, oldLocation.longitude);

      /* if distance greater 350m (distance between hall 7 and conti roundabout) */
      if( distance >= 350 && oldSeatMask !== newData.seatMask ){
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

exports.setAmountMade = functions.firestore
    .document('vehicles/{vehicle}/snapshots/{snapshot}')
    .onCreate(async (snap, context) => {

        const vehicle = context.params.vehicle;

        try{
          var vehicleDocRef = db.collection('vehicles').doc(vehicle);
          numberOfSeats = await vehicleDocRef.get('numberOfSeats');
          var snapshotQuerySnapShots = await vehicleDocRef
                .collection('snapshots')
                .orderBy('timestamp')
                .get();
          
        }catch(error){
          console.log(error);
          return;
        }
        
        totalTripDistance = null;
        docs = snapshotQuerySnapShots.docs;
        size = snapshotQuerySnapShots.size;

        distances = []; 
        for(i = 1; i <= numberOfSeats; i++){

          j = 0
          while(j < size){
            seatMask = parseInt(docs[j].get('seatMask'));

            if(seats.seatOccupied(seatMask, i)){
              k = j+1
              while(k < size){
                seatMask = parseInt(docs[k].get('seatMask')); 
                if(seats.seatOccupied(seatMask, i)){
                  k++;
                }else{
                  origin = doc[j].get('location')
                  originTime = doc[j].get('timestamp');
                  
                  destination = doc[k-1].get('location');
                  destinationTime = doc[k-1].get('timestamp');

                  originLon = origin.longitude;
                  originLat = origin.latitude;
                  destinationLon = destination.longitude;
                  destinationLat = destination.latitude;

                  distances.push(distanceMatrix.getDistance(originLat, originLon, destinationLat, destinationLon));
                  j = k;
                  break;
                }
              }
            }else j++;
          }
        }

        await Promise.all(distances)
        totalTripDistance = distance.reduce((total, num)=> {
          return total + num;
        });

        if(totalTripDistance !== null){
          amountMade = (0.8/350)*totalTripDistance; // rate learnt from averaging route distance
          var newData = new Object();
          newData.amountMade = amountMade;
          await vehicleDocRef.update(newData)
            .catch((error)=>{
              console.log(error);
            });
        }
    });

// exports.getAmountPeriod =  functions.https.onRequest(async (req, res) => {
    

//     startTime = req.body.startTime;
//     endTime = req.body.endTime;
    
//     const vehicle = context.params.vehicle;

//     try{
//       var vehicleDocRef = db.collection('vehicles').doc(vehicle);
//       numberOfSeats = await vehicleDocRef.get('numberOfSeats');
//       var snapshotQuerySnapShots = await vehicleDocRef
//             .collection('snapshots')
//             .where('timestamp','>=',startTime)
//             .where('timestamp','<=',endTime)
//             .orderBy('timestamp')
//             .get();
      
//     }catch(error){
//       console.log(error);
//       res.sendStatus(500);
//       return;
//     }
    
//     totalTripDistance = 0;
//     docs = snapshotQuerySnapShots.docs;
//     size = snapshotQuerySnapShots;

//     for(i = 1; i <= numberOfSeats; i++){

//       j = 0
//       while(j < size){
//         seatMask = docs[j].get('seatMask');

//         if(seats.seatOccupied(seatMask, i)){
//           k = j+1
//           while(k < size){
//             seatMask = docs[k].get('seatMask');
//             if(seats.seatOccupied(seatMask, i)){
//               k++;
//             }else{
//               origin = doc[j].get('location')
//               originTime = doc[j].get('timestamp');
              
//               destination = doc[k-1].get('location');
//               destinationTime = doc[k-1].get('timestamp');

//               originLon = origin.longitude;
//               originLat = origin.latitude;
//               destinationLon = destination.longitude;
//               destinationLat = destination.latitude;

//               distance = await distanceMatrix.getDistance(originLat, originLon, destinationLat, destinationLon);
//               totalTripDistance = totalTripDistance + distance;
//               j = k;
//               break;
//             }
//           }
//         }else j++;
//       }
//     }

//   amountMade = (0.8/350)*totalTripDistance; // rate learnt from averaging route distance
//   res.status(200).send(amountMade);
    
// });
