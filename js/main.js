var CURR_TIME = (Math.floor(Date.now() / 1000)+31536000) * 1000000000;
var NON_ACTIVE_NUMBERS = [0, 3, 4, 5, 72, 109, 110, 111, 112] //2 = on foot... not sure how to count that
var SLEEP_NUMBERS = [72, 109, 110, 111]
var DAY = 86400000 //number of milliseconds in a day

var weight_data;
var all_activity_data;
var id_token;
var graphs = {};

function ToggleFlipped(id) {
  d3.select(id).classed('flip', !d3.select(id).classed('flip'));
}

function onSignIn(googleUser) {
  d3.select("#sign-in-button").classed("visuallyhidden", true);
  var profile = googleUser.getBasicProfile();

  id_token = googleUser.getAuthResponse().id_token;

  d3.select("#settings-drawer-header")
    .append("img")
      .attr("id", "profile-pic")
      .attr("src", profile.getImageUrl())
      .classed("demo-avatar", true);

  d3.select("#settings-drawer-header")
    .append("a")
      .attr("href", "#")
      .attr("id", "signout-link")
      .attr("onclick", "signOut();")
      .text("Sign out");

  loadGapi();
}

function onFailure(error) {
  console.log(error);
}

function signOut() {
  id_token = null;
  var auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(function () {
    d3.select("#signout-link").remove();
    d3.select("#profile-pic").remove();
    d3.select("#sign-in-button").classed("visuallyhidden", false);
    console.log('User signed out.');
  });
}

function addCard(variable) {

  var card = d3.select("#card-area")
    .append("div")
      .classed("mdl-cell mdl-cell-stretch mdl-cell--12-col", true)
    .append("div")
      .attr("id", variable+"-card")
      .classed("click panel mdl-cell mdl-cell-stretch mdl-cell--12-col", true);

  var front = card.append("div")
                  .classed("mdl-card mdl-shadow--2dp mdl-cell-stretch front mdl-cell mdl-cell--12-col", true)

  front.append("div")
        .classed("mdl-card__title mdl-card--expand mdl-color--teal-300  mdl-cell mdl-cell--12-col", true)
      .append("h2")
        .classed("mdl-card__title-text", true)
        .text(variable.replace("-"," "));

  front.append("div")
      .classed("mdl-card__supporting-text mdl-color-text--grey-600  mdl-cell mdl-cell--12-col", true)
      .append("div")
      .attr("id", variable+"-graph");

  front.append("div")
      .classed("mdl-card__actions mdl-card--border  mdl-cell mdl-cell--12-col", true)
      .append("button")
      .classed("mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect", true)
      .attr("OnClick", "ToggleFlipped('#" + variable + "-card')")
      .text("Settings");

  var back = card.append("div")
                .classed("back mdl-cell-stretch mdl-card demo-options mdl-shadow--2dp mdl-color--deep-purple-500 mdl-cell mdl-cell--12-col", true)

  var settings_div = back.append("div");

  settings_div.classed("mdl-card__supporting-text mdl-color-text--blue-grey-50  mdl-cell mdl-cell--12-col", true);
  settings_div.append("h3")
              .text("Settings")
              .attr("height", document.getElementById(variable+"-graph").offsetWidth/2);

  var settings_list = settings_div.append("ul");

  /// Y axis switch

  var label = settings_list.append("li")
               .append("label")
                  .attr("for", variable+"-y_axis-toggle")
                  .classed("mdl-switch mdl-js-switch mdl-js-ripple-effect", true);

  label.append("input")
       .classed("mdl-switch__input", true)
       .attr("type", "checkbox")
       .attr("id", variable+"-y_axis-toggle");

  if (variable != "Weight") {
    document.getElementById(variable+"-y_axis-toggle").checked = true;
  }

  label.append("span")
       .classed("mdl-switch__label", true)
       .text("Y-axis labels");

  $("#"+variable+"-y_axis-toggle").on("change", function(){toggleYAxis(variable);});

  // Points switch

  label = settings_list.append("li")
               .append("label")
               .attr("for", variable+"-plot-points-toggle")
               .classed("mdl-switch mdl-js-switch mdl-js-ripple-effect", true);

  label.append("input")
       .classed("mdl-switch__input", true)
       .attr("type", "checkbox")
       .attr("id", variable+"-plot-points-toggle");


  label.append("span")
       .classed("mdl-switch__label", true)
       .text("Plot points");

  $("#"+variable+"-plot-points-toggle").on("change", function(){togglePoints(variable);});

  // Confidence interval switch

  label = settings_list.append("li")
              .append("label")
              .attr("for", variable+"-plot-confint-toggle")
              .classed("mdl-switch mdl-js-switch mdl-js-ripple-effect", true);

  label.append("input")
      .classed("mdl-switch__input", true)
      .attr("type", "checkbox")
      .property("checked", true)
      .attr("id", variable+"-plot-confint-toggle");

  $("#"+variable+"-plot-confint-toggle").on("change", function(){toggleConfInt(variable);});

  label.append("span")
      .classed("mdl-switch__label", true)
      .text("Plot confidence interval");

  // Loess bandwidth slider

  var list_el = settings_list.append("li");

  makeTimePeriodRadioButton(list_el, variable, "day", true);
  makeTimePeriodRadioButton(list_el, variable, "week", false);
  makeTimePeriodRadioButton(list_el, variable, "month", false);

  list_el = settings_list.append("li");

  list_el.append("input")
         .attr("type", "range")
         .attr("min", 0)
         .attr("max", 1)
         .attr("tabindex", 0)
         .attr("step", .01)
         .attr("value", .8)
         .attr("id", variable+"-smoothness-slider")
         .attr("oninput", "updateSmoothness('"+variable+"');") //should really by onchange, but that doesn't work for some reason
         .classed("mdl-slider mdl-js-slider", true);

  list_el.append("span")
         .classed("mdl-switch__label", true)
         .text("Smoothness");

  back.append("div")
      .classed("mdl-card__actions mdl-card--border mdl-cell mdl-cell--12-col", true)
      .append("button")
      .classed("mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect", true)
      .attr("OnClick", "ToggleFlipped('#" + variable + "-card')")
      .text("Back");

  if(!(typeof(componentHandler) == 'undefined')){
        componentHandler.upgradeAllRegistered();
    }

  //$("#"+variable+"-smoothness-slider").on("change", function(){updateSmoothness(variable);});

  options = {"smoothing":document.getElementById(variable+"-smoothness-slider").value,
             "y_axis_ticks":document.getElementById(variable+"-y_axis-toggle").checked,
             "confint":document.getElementById(variable+"-plot-confint-toggle").checked,
             "points":document.getElementById(variable+"-plot-points-toggle").checked
           };

  callMakeGraph(variable, options);
}

function makeTimePeriodRadioButton(list_el, variable, unit, checked) {
  var label = list_el.append("label");

  label.classed("mdl-radio mdl-js-radio mdl-js-ripple-effect", true)
       .attr("for", variable + "-time-unit-"+unit)
     .append("input")
       .property("checked", checked)
       .classed("mdl-radio__button", true)
       .attr("id", variable + "-time-unit-"+unit)
       .attr("type", "radio")
       .attr("name", variable+"-time-unit")
       .attr("value", unit);

  label.append("span")
       .classed("mdl-radio__label", true)
       .text(unit[0].toUpperCase() + unit.slice(1) + "\xa0\xa0");
}

function callMakeGraph(variable, options){
  if (variable == "Sleep") {
    graphSleepData(options);
  } else if (variable == "Weight") {
    makeGraph(weight_data, "#Weight-graph", options);
  } else if (variable == "Active-time") {
    graphTotalActivityData(options);
  }
}

function toggleConfInt(variable) {
  var g = graphs[variable+"-graph"];
  g.options.confint = !g.options.confint;
  g.vis.remove();
  callMakeGraph(variable, g.options);
}

function togglePoints(variable) {
  var g = graphs[variable+"-graph"];
  g.options.points = !g.options.points;
  g.vis.remove();
  callMakeGraph(variable, g.options);
}

function toggleYAxis(variable) {
  var g = graphs[variable+"-graph"];
  g.options.y_axis_ticks = !g.options.y_axis_ticks;
  g.vis.remove();
  callMakeGraph(variable, g.options);
}

function updateSmoothness(variable) {
  console.log("update smoothness");
  var g = graphs[variable+"-graph"];
  g.options.smoothing = document.getElementById(variable+"-smoothness-slider").value;
  console.log(g.options.smoothing);
  g.vis.remove();
  callMakeGraph(variable, g.options);
}

function getWeight() {
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
        weight_data = data;
      });
  }, function(reason) {
    console.log('Error: ' + reason.result.error.message);
  });
};

function loadData() {
  // d3.selectAll(".getdata").classed("disabled", false);
  getWeight();
  getActivity();
}

function loadGapi() {
  gapi.load('client', loadData);
};

function getDataFromStream(streamId) {
  console.log("https://www.googleapis.com/fitness/v1/users/me/dataSources/"+streamId+"/datasets/0-"+CURR_TIME);
  return gapi.client.request("https://www.googleapis.com/fitness/v1/users/me/dataSources/"+streamId+"/datasets/0-"+CURR_TIME);
}

function getActivity(){

  var activity_data = gapi.client.request({
    "path" : "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    "method" : "POST",
    "body":{
      "aggregateBy": [
        {
          "dataTypeName": "com.google.activity.segment"
        }
      ],
      "endTimeMillis": Date.now(),
      "startTimeMillis": Date.now() - (30*DAY),
      "bucketByTime": {
        "period": {
          "type": "day",
          "value": 1,
          "timeZoneId": moment.tz.guess()
        }}
    }
  });
  activity_data.then(function(response){
    all_activity_data = response.result.bucket;

  }, function(reason) {
    console.log('Error: ' + reason.result.error.message);
  });
}

function graphSleepData(options){
  sleep_data = [];
  for (i in all_activity_data) {
    if (all_activity_data[i].dataset[0].point.length > 0) {
      sleep_data.push([new Date(+all_activity_data[i].dataset[0].point[0].startTimeNanos/1000000), 0]);
    }
    for (j in all_activity_data[i].dataset[0].point){
      if (SLEEP_NUMBERS.includes(+all_activity_data[i].dataset[0].point[j].value[0].intVal)) {
        sleep_data[sleep_data.length-1][1] += +all_activity_data[i].dataset[0].point[j].value[1].intVal/3600000;
      }
    }
  }
  makeGraph(sleep_data, "#Sleep-graph", options);
}

function graphTotalActivityData(options){
  data = [];
  for (i in all_activity_data) {
    if (all_activity_data[i].dataset[0].point.length > 0) {
      data.push([new Date(+all_activity_data[i].dataset[0].point[0].startTimeNanos/1000000), 0]);
    }
    for (j in all_activity_data[i].dataset[0].point){
      if (!NON_ACTIVE_NUMBERS.includes(+all_activity_data[i].dataset[0].point[j].value[0].intVal)) {
        data[data.length-1][1] += +all_activity_data[i].dataset[0].point[j].value[1].intVal/3600000;
      }
    }
  }
  makeGraph(data, "#Active-time-graph", options);
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

function toggleLabelYAxis() {
  $.ajax("http://www.stability-app.com/update_settings", {
      type:"POST",
      contentType:"application/json",
      data:JSON.stringify({"user":id_token, "value":true}),
      success:function() {alert("success");},
      error: function() {alert("failure");}
  });

  // var xmlHttp = new XMLHttpRequest();
  // xmlHttp.open( "POST", "http://stability-app.com/update_settings", true );
  // xmlHttp.send({"user":id_token, "value":true});
}

function makeGraph(data, svg_id, options){
  // Based on https://github.com/jasondavies/science.js/blob/master/examples/loess/loess.js


  var id_without_hash = svg_id.slice(1, svg_id.length);

  var w = document.getElementById(id_without_hash).offsetWidth,
      h = w/2,
      p = 35.5,
      n = 100;

  w -= 2*p; //margins need to come out of width

  var min_band = 2/data.length;

  var loess = science.stats.loess().bandwidth(d3.max([min_band, options.smoothing]));

  var zipped_data = d3.transpose(data);
  var original_data = data;
  var loess_result = loess(zipped_data[0], zipped_data[1]);

  zipped_data[1] = loess_result.loess;
  zipped_data.push(loess_result.confint);
  data = d3.zip(zipped_data[0], zipped_data[1], zipped_data[2]);

  max_y = d3.max(data, function(d){return d[2] ? d[1]+d[2] : d[1];});
  min_y = d3.min(data, function(d){return d[2] ? d[1]-d[2] : d[1];});

  //Add margins
  max_y += max_y*.2
  if (min_y > 0) {
    min_y -= min_y*.2;
  }

  var x = d3.scaleTime().domain([new Date(data[0][0]), new Date(data[data.length-1][0])]).range([0, w]);
  var y = d3.scaleLinear().domain([min_y, max_y]).range([h, 0]);

  var xAxis = d3.axisBottom(x),
      yAxis = d3.axisLeft(y);

  var svg = d3.select(svg_id)
    .append("svg")
      .attr("width", w + p + p)
      .attr("height", h + p + p);
  var vis =  svg.append("g")
      .attr("transform", "translate(" + p + "," + p + ")");

  var area = d3.area()
        .x(function(d) { return x(d[0]); })
        .y0(function(d) { return d[2] ? y(d[1]-d[2]) : y(d[1]);})
        .y1(function(d) { return d[2] ? y(d[1]+d[2]) : y(d[1]);});


  if (options.confint){
    vis.selectAll("path")
        .data([data])
      .enter().append("path")
        .attr("d", function(d){return area(d);})
        .attr("stroke", "black")
        .attr("fill", "purple")
        .attr("stroke-width", 1);
  }

  if (options.points){
    vis.selectAll("circle")
       .data(original_data)
       .enter()
       .append("circle")
       .attr("r", 5)
       .attr("cx", function(d){return x(d[0]);})
       .attr("cy", function(d){return y(d[1]);});
  }

  vis.append("g")
      .attr("class", "bottom axis")
      .attr("transform", "translate(0," + h + ")")
      .call(xAxis);

  if (!options.y_axis_ticks) {
    yAxis.ticks(0);
  }

  vis.append("g")
      .attr("class", "left axis")
      .call(yAxis);

  graphs[id_without_hash] = {"x_axis":xAxis, "y_axis":yAxis, "vis":svg, "options":options};
}
