 /* eslint-disable */

// The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access Firestore.
const admin = require('firebase-admin');
admin.initializeApp();
const token = process.env['API_KEY'];
const https = require('https');
const { write } = require('fs');
var json = "";

exports.addLocation = functions.https.onRequest(async (req, res) => {
    var data = [];
    var sdata = "";
    var latitude = "";
    var longitude = "";
    var locationdata = [];
    var jsonLocationdata = "";
    var temp = [];
    var maxTemp = [];
    var minTemp = [];
    var resultJson
   
    var todayDate = new Date().toISOString().slice(0, 10);
    const original = req.query.location;
    const options = "https://maps.googleapis.com/maps/api/geocode/json?address=" + original + ",+CA&key=" + "AIzaSyDBTFOUT_88qqdmi4cqV31LDpX-2YAqaYY";
    const request = https.request(options, async function(res) {
        console.log(`statusCode: ${res.statusCode}`)
      
        res.on('data',function(chunk){
            data.push(chunk)
        })
        res.on('end', async function(){
            sdata = JSON.parse(data.join(''))
            latitude = sdata.results[0].geometry.location.lat
            longitude = sdata.results[0].geometry.location.lng
            const forcastoptions = "https://www.7timer.info/bin/astro.php?lon=" + longitude + "&lat=" + latitude + "&ac=0&unit=metric&output=json&tzshift=0"
        const _request = https.request(forcastoptions, function(res) {
          console.log(`statusCode: ${res.statusCode}`)
        
          res.on('data',function(chunk){
            locationdata.push(chunk) 
          })
  
          res.on('end',function(){
            jsonLocationdata = JSON.parse(locationdata.join(''))
            for (let index = 0; index < jsonLocationdata.dataseries.length; index++) {
              temp.push(jsonLocationdata.dataseries[index].temp2m);
            }
            // console.log(temp)
            minTemp = Math.min.apply(null, temp),
            maxTemp = Math.max.apply(null, temp);
            var todayDate = new Date().toISOString().slice(0, 10);
            // console.log(todayDate)
            // console.log(minTemp,maxTemp)
            json = {
              "date" :todayDate,
              "min":minTemp,
              "max":maxTemp
            }
            const writeResult = admin.firestore().collection("location").doc(original).collection(todayDate).doc(original).set({"date": todayDate, "min": minTemp, "max": maxTemp, location: original }, {merge: true})
            
          })
        })
        _request.on('error', error => {
          console.error(error)
        })
       
        })
        
      })
      request.on('error', error => {
        console.error(error)
      })
      request.end()
      
      var query = {};
      var todayDate = new Date().toISOString().slice(0, 10);
      var forcastRef = admin.firestore().collection("location").doc(original).collection(todayDate).doc(original)
      const forcast = await forcastRef.get().then(function(doc) {
        if (doc.empty) {
          console.log("It's empty")
        }else{
          query = doc.data()
          console.log("query", query)
        }
      })
      .catch(err => {
        console.log('Error getting document', err);
      });
     
      if (query != {}) {
        var resultJson = {
          "date" : query.date,
          "min-Forcasted": query.min,
          "max-Forcasted":query.max
        }
        console.log(query)
      }else{
       var resultJson = "Try again"
      }
      // console.log(query)
      
    // const writeResult = await admin.firestore().collection("location").doc(original).collection(todayDate).add({location:original});
    res.json({result: resultJson});
});



function checkForcast (lat, long) {
    var locationdata = [];
    var jsonLocationdata = "";
    var temp = [];
    var maxTemp = [];
    var minTemp = [];
    const forcastoptions = "https://www.7timer.info/bin/astro.php?lon=" + long + "&lat=" + lat + "&ac=0&unit=metric&output=json&tzshift=0"
    const req = https.request(forcastoptions, res => {
        console.log(`statusCode: ${res.statusCode}`)
      
        res.on('data',function(chunk){
          locationdata.push(chunk) 
        })

        res.on('end',function(){
          jsonLocationdata = JSON.parse(locationdata.join(''))
          for (let index = 0; index < jsonLocationdata.dataseries.length; index++) {
            temp.push(jsonLocationdata.dataseries[index].temp2m);
          }
          minTemp = Math.min.apply(null, temp),
          maxTemp = Math.max.apply(null, temp);
          var todayDate = new Date().toISOString().slice(0, 10);
          console.log(todayDate)
          console.log(minTemp,maxTemp)
          json = {
            "date" : todayDate,
            "min-forecasted":minTemp,
            "max-forecasted":maxTemp
          }
         
        })
      })
      req.on('error', error => {
        console.error(error)
      })
      req.end()

      return minTemp
}

exports.searchForForcast = functions.https.onRequest(async(req, res) =>{
  var location = req.query.location;
  var start_date = req.query.start_date;
  var end_date = req.query.end_date;
  var query = [];
  var dateRange = [];
  var resultQuery = [];
  // console.log(location, start_date, end_date)
  for(var arr=[],dt=new Date(start_date); dt<=new Date(end_date); dt.setDate(dt.getDate()+1)){
    dateRange.push(new Date(dt).toISOString().slice(0, 10));
  }
  console.log(dateRange);
  if (dateRange.length == 1) {
    var forcastRef =  admin.firestore().collection("location/"+location+"/"+dateRange[0]).doc(location)
    const forcast = await forcastRef.get().then(doc => {
      query.push(doc.data())
      console.log(doc.data())
    })
    .catch(err => {
      console.log('Error getting document', err);
    });
  }else if (dateRange.length > 1) {
    for (let index = 0; index < dateRange.length; index++) {
      var forcastRef = await admin.firestore().collection("location/"+location+"/"+dateRange[index].toString()).doc(location).get().then(function(snapshot) {
          if (snapshot.empty) {
            console.log("snapshot is empty")
          }else{
            query.push(snapshot.data())
            console.log(query)
          }
      })
    }
  }else{
    console.log("input the right date range")
  }
  
  res.json({result: query})
})