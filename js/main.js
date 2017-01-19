var curr_time = (Math.floor(Date.now() / 1000)+31536000) * 1000000000;

function onSignIn(googleUser) {
  var profile = googleUser.getBasicProfile();
  console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
  console.log('Name: ' + profile.getName());
  console.log('Image URL: ' + profile.getImageUrl());
  console.log('Email: ' + profile.getEmail());

  var access_token = googleUser.getAuthResponse().access_token;
  console.log("ID Token: " + access_token);

  // gapi.client.request("https://www.googleapis.com/fitness/v1/users/me/dataSources/derived:com.google.weight:com.google.android.gms:merge_weight/datasets/0-1484461008")
}

function signOut() {
  var auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(function () {
    console.log('User signed out.');
  });
}

function start() {
  // 2. Initialize the JavaScript client library.
  gapi.client.request("https://www.googleapis.com/fitness/v1/users/me/dataSources?dataTypeName=com.google.weight")
    .then(function(response) {
      weight_sources = response.result;
      idlist = [];
      for (el in weight_sources.dataSource){
        streamId = weight_sources.dataSource[el].dataStreamId;
        if (streamId == "derived:com.google.weight:com.google.android.gms:merge_weight") {
          idlist = [streamId];
          break;
        } else {
          idlist.push(streamId);
        }
      }
      Promise.all(idlist.map(getDataFromStream)).then(function(values){
        var data = extractDataFromStreams(values);
        for (el in data) {
          // Extract data from JSON object and convert kg to pounds
          data[el] = [new Date(+data[el].endTimeNanos/1000000), data[el].value[0].fpVal*2.20462];
        }
        console.log(data);
        makeGraph(data);
      });
  }, function(reason) {
    console.log('Error: ' + reason.result.error.message);
  });
};
// 1. Load the JavaScript client library.
function getData() {
  gapi.load('client', start);
}
function getDataFromStream(streamId) {
  console.log("https://www.googleapis.com/fitness/v1/users/me/dataSources/"+streamId+"/datasets/0-"+curr_time);
  return gapi.client.request("https://www.googleapis.com/fitness/v1/users/me/dataSources/"+streamId+"/datasets/0-"+curr_time);
}

function getActivity(){
  return gapi.client.request({
    "path" : "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    "method" : "POST",
    "body":{
      "aggregateBy": [
        {
          "dataTypeName": "com.google.activity.segment"
        }
      ],
      "endTimeMillis": Date.now(),
      "startTimeMillis": "1482037200000",
      "bucketByTime": {
        "period": {
          "type": "day",
          "value": 1,
          "timeZoneId": moment.tz.guess()
        }}
    }
  });
}

function extractDataFromStreams(streams) {
  var data = [];
  for (stream in streams) {
    var curr = streams[stream].result.point;
    if (curr.length > data.length) {
      data = curr;
    }
  }

  return data;
}

function makeGraph(data){
  // Based on https://github.com/jasondavies/science.js/blob/master/examples/loess/loess.js

  var w = 960,
      h = 500,
      p = 35.5,
      n = 100,
      x = d3.scaleTime().domain([new Date(data[0][0]-86400000), new Date(data[data.length-1][0]+86400000)]).range([0, w]),
      y = d3.scaleLinear().domain([160,220]).range([h, 0]);

  var xAxis = d3.axisBottom(x),
      yAxis = d3.axisLeft(y);

  var vis = d3.select("#vis")
    .append("svg")
      .attr("width", w + p + p)
      .attr("height", h + p + p)
    .append("g")
      .attr("transform", "translate(" + p + "," + p + ")");

  var min_band = 2/data.length;

  var loess = science.stats.loess().bandwidth(d3.max([min_band, .8]));

  var zipped_data = d3.transpose(data);
  var loess_result = loess(zipped_data[0], zipped_data[1]);
  console.log("loess", loess_result);
  zipped_data[1] = loess_result.loess;
  zipped_data.push(loess_result.confint);
  data = d3.zip(zipped_data[0], zipped_data[1], zipped_data[2]);

  var area = d3.area()
        .x(function(d) { return x(d[0]); })
        .y0(function(d) { return d[2] ? y(d[1]-d[2]) : y(d[1]);})
        .y1(function(d) { return d[2] ? y(d[1]+d[2]) : y(d[1]);});


  vis.selectAll("path")
      .data([data])
    .enter().append("path")
      .attr("d", function(d){return area(d);})
      .attr("stroke", "black")
      .attr("fill", "purple")
      .attr("stroke-width", 1);

  vis.append("g")
      .attr("class", "bottom axis")
      .attr("transform", "translate(0," + h + ")")
      .call(xAxis);

  vis.append("g")
      .attr("class", "left axis")
      .call(yAxis);
}
