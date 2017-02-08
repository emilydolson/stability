var CURR_TIME = (Math.floor(Date.now() / 1000)+31536000) * 1000000000;
var NON_ACTIVE_NUMBERS = [0, 3, 4, 5, 72, 109, 110, 111, 112] //2 = on foot... not sure how to count that
var SLEEP_NUMBERS = [72, 109, 110, 111]
var DAY = 86400000 //number of milliseconds in a day

var all_data = {};
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

function loadGapi() {
  gapi.load('client', getPreferences);
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
      .classed("mdl-cell mdl-cell-stretch mdl-cell--6-col", true)
    .append("div")
      .attr("id", variable+"-card")
      .classed("click panel mdl-cell mdl-cell-stretch mdl-cell--6-col", true);

  var front = card.append("div")
                  .classed("mdl-card mdl-shadow--2dp mdl-cell-stretch front mdl-cell mdl-cell--6-col", true)

  front.append("div")
        .classed("mdl-card__title mdl-card--expand mdl-color--teal-300", true)
      .append("h2")
        .classed("mdl-card__title-text", true)
        .text(variable.replace("-"," "));

  front.append("div")
      .classed("mdl-card__supporting-text setheight mdl-color-text--grey-600 ", true)
      .append("div")
      .style("height", "100%")
      .attr("id", variable+"-graph");

  front.append("div")
      .classed("mdl-card__actions mdl-card--border", true)
      .append("button")
      .classed("mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect", true)
      .attr("OnClick", "ToggleFlipped('#" + variable + "-card')")
      .text("Settings");

  var back = card.append("div")
                .classed("back mdl-cell-stretch mdl-card demo-options mdl-shadow--2dp mdl-color--deep-purple-500 mdl-cell mdl-cell--6-col", true)

  var settings_div = back.append("div");

  settings_div.classed("mdl-card__supporting-text setheight_noheader mdl-color-text--blue-grey-50  mdl-cell mdl-cell--6-col", true);
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
      .classed("mdl-card__actions mdl-card--border mdl-cell mdl-cell--6-col", true)
      .append("button")
      .classed("mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect", true)
      .attr("OnClick", "ToggleFlipped('#" + variable + "-card')")
      .text("Back");

  if(!(typeof(componentHandler) == 'undefined')){
        componentHandler.upgradeAllRegistered();
    }

  //$("#"+variable+"-smoothness-slider").on("change", function(){updateSmoothness(variable);});

  options = {"variable":variable,
             "smoothing":document.getElementById(variable+"-smoothness-slider").value,
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
    getActivity( function() {
      calcSleepTimeData(all_data);
      makeGraph(all_data.sleeptime, "#Sleep-graph", options);
    });
  } else if (variable == "Weight") {
    getWeight(function(){
      makeGraph(weight_data, "#Weight-graph", options);
    })
  } else if (variable == "Active-time") {
    getActivity( function() {
      calcActiveTimeData(all_data);
      makeGraph(all_data.activetime, "#Active-time-graph", options);
    });
  }
  updatePreferences();
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

// function loadData() {
//   // d3.selectAll(".getdata").classed("disabled", false);
//   getWeight();
//   getActivity();
// }



function getDataFromStream(streamId) {
  console.log("https://www.googleapis.com/fitness/v1/users/me/dataSources/"+streamId+"/datasets/0-"+CURR_TIME);
  return gapi.client.request("https://www.googleapis.com/fitness/v1/users/me/dataSources/"+streamId+"/datasets/0-"+CURR_TIME);
}

function getWeight(callback) {

  if (all_data.weight_data) {
    callback();
    return;
  }

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
        all_data.weight_data = data;
        callback();
      });
  }, function(reason) {
    console.log('Error: ' + reason.result.error.message);
  });
};

function getActivity(callback){
  if (all_data.all_activity_data) {
    callback();
    return;
  }

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
        }
      }
    }
  });
  activity_data.then(function(response){
    all_data.all_activity_data = response.result.bucket;
    callback();
  }, function(reason) {
    console.log('Error: ' + reason.result.error.message);
  });
}




function updatePreferences() {
  $.ajax("http://www.stability-app.com/update_settings", {
      type:"POST",
      contentType:"application/json",
      data:JSON.stringify({"user":id_token, "value":JSON.stringify(graphs)}),
      success:function() {console.log("success");},
      error: function() {alert("failure");}
  });
}

function getPreferences() {
  $.ajax("http://www.stability-app.com/get_settings", {
      type:"POST",
      contentType:"application/json",
      data:JSON.stringify({"user":id_token}),
      success:function(settings) {restoreSettings(settings);},
      error: function() {alert("failure");}
  });
}

function restoreSettings(settings) {
  graphs = JSON.parse(settings);
  for (graph in graphs) {
    addCard(graphs[graph].options.variable);
  }
}
