var rp = require('request-promise');
disatnceMatrixAPIKey = 'AIzaSyDvcgX93U8CFCp3Bn6_y8U-Q1e1EFbcPko';

exports.getDistance = async function func( originLat, originLon, destinationLat, destinationLon ){

    var options = {
        uri: 'https://maps.googleapis.com/maps/api/distancematrix/json',
        qs: {
          origins: originLat + ',' + originLon,
          destinations: destinationLat + ','+ destinationLon,
          mode: 'driving',
          language: 'en',
          key: disatnceMatrixAPIKey
        },
        json: true // Automatically parses the JSON string in the response
    };

    distanceMatrixResponse = await rp(options)
      .catch( (error) => {
        console.log(error);
        return null;
      });

    distanceMatrixElement = distanceMatrixResponse.rows[0].elements[0];

    if( distanceMatrixElement.status == 'OK'){
        return distanceMatrixElement.distance.value;
    }

    return null;
}