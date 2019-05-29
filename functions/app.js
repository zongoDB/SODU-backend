const admin = require('firebase-admin');
const functions = require('firebase-functions');

var distanceMatrix = require('./distanceMatrix.js');
var seats = require('./seats.js')

admin.initializeApp(functions.config().firebase);
var db = admin.firestore();

function bitCount (n) {
  n = n - ((n >> 1) & 0x55555555)
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
  return ((n + (n >> 4) & 0xF0F0F0F) * 0x1010101) >> 24
}

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
        
        docs = snapshotQuerySnapShots.docs;
        size = snapshotQuerySnapShots.size;

        distances = [];
        seatMaskbits = []
  		  i = 0;
        while(i < size){

          for(j = i+1; j < size; j++){
            if(j === size - 1){
              origin = docs[i].get('location')
            destination = docs[j].get('location');
            
            originLon = origin.longitude;
            originLat = origin.latitude;
            destinationLon = destination.longitude;
            destinationLat = destination.latitude;
            
            seatMask = parseInt(docs[i].get("seatMask"), 10);
            seatMaskbits.push(bitCount(seatMask));

            distances.push(distanceMatrix.getDistance(originLat, originLon, destinationLat, destinationLon));
        	  i = j;
            break;
            }
            if(docs[i].get("seatMask") === docs[j].get("seatMask")){
              continue;
            }
            origin = docs[i].get('location')
            destination = docs[j].get('location');
            
            originLon = origin.longitude;
            originLat = origin.latitude;
            destinationLon = destination.longitude;
            destinationLat = destination.latitude;
            
            seatMask = parseInt(docs[i].get("seatMask"), 10);
            seatMaskbits.push(bitCount(seatMask));

            distances.push(distanceMatrix.getDistance(originLat, originLon, destinationLat, destinationLon));
        	  i = j;
            break;
          }
          i++;
        }
  
  		  Promise.all(distances).then((data) => {
          totalTripDistance = 0;

          for(i = 0; i < data.length; i++){
            totalTripDistance += (data[i] * seatMaskbits[i]);
          }

          console.log(totalTripDistance);
          amountMade = (0.8/350)*totalTripDistance; // rate learnt from averaging route distance
          var newData = new Object();
          newData.amountMade = amountMade;
          newData.tripDistance = totalTripDistance;
          vehicleDocRef.update(newData)
            .catch((error)=>{
              console.log(error);
            });

          return;
        }).catch((err) => {
          console.log(err);
        });
      
    });