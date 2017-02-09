var CURR_TIME = (Math.floor(Date.now() / 1000)+31536000) * 1000000000;
var NON_ACTIVE_NUMBERS = [0, 3, 4, 5, 72, 109, 110, 111, 112] //2 = on foot... not sure how to count that
var SLEEP_NUMBERS = [72, 109, 110, 111]
var DAY = 86400000 //number of milliseconds in a day

var all_data = {};
var id_token;
var graphs = {};

var defaults = {
  "Active-time" : {"variable": "Active-time",
                   "smoothing": .3,
                   "y_axis_ticks": true,
                   "confint": true,
                   "points": true,
                   "index" : 0
                  },
  "Steps" :       {"variable": "Steps",
                   "smoothing": .3,
                   "y_axis_ticks": true,
                   "confint": true,
                   "points": true,
                   "index" : 0
                  },
  "Distance" :    {"variable": "Distance",
                   "smoothing": .3,
                   "y_axis_ticks": true,
                   "confint": true,
                   "points": true,
                   "index" : 0
                  },
  "Sleep" :       {"variable": "Sleep",
                   "smoothing": .3,
                   "y_axis_ticks": true,
                   "confint": true,
                   "points": true,
                   "index" : 0
                  },
  "Weight" :      {"variable": "Weight",
                   "smoothing": .9,
                   "y_axis_ticks": false,
                   "confint": true,
                   "points": false,
                   "index" : 0
                  }
}

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

  $("#safe-mode-switch").on("change", function(){
    if (this.checked) {
      safeModeOn();
    } else {
      safeModeOff();
    }
  });

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

function safeModeOn() {
  d3.selectAll(".unsafe").classed("hidden", true);
  updatePreferences();
}

function safeModeOff() {
  d3.selectAll(".unsafe").classed("hidden", false);
  updatePreferences();
}

function removeCard(id) {
  d3.select(id+"-outer").remove();
  delete graphs[id.slice(1,id.length-4)+"graph"];
  updatePreferences();
}

function addCard(variable, options=null) {

  if (!options) {
    options = defaults[variable];
    for (g in graphs) {
      if (graphs[g].options.variable == variable) {
        options.index += 1;
      }
    }
  }

  variable += options.index;

  var card = d3.select("#card-area")
    .append("div")
      .classed("mdl-cell mdl-cell-stretch mdl-cell--6-col", true)
      .attr("id", variable+"-card-outer")
    .append("div")
      .attr("id", variable+"-card")
      .classed("click panel mdl-cell mdl-cell-stretch mdl-cell--6-col", true);

  var front = card.append("div")
                  .classed("mdl-card mdl-shadow--2dp mdl-cell-stretch front mdl-cell mdl-cell--6-col", true)

  var title = front.append("div")
        .classed("mdl-card__title mdl-card--expand mdl-color--teal-300", true);

  title.append("button")
       .attr("OnClick", "removeCard('#" + variable + "-card')")
       .classed("mdl-button mdl-js-button mdl-button--icon upperright", true)
       .append("i")
       .classed("material-icons", true)
       .text("clear");

  title.append("h2")
       .classed("mdl-card__title-text", true)
       .text(options.variable.replace("-"," "));

  front.append("div")
      .classed("mdl-card__supporting-text setheight mdl-color-text--grey-600 ", true)
      .style("width", "100%")
      .append("div")
      .style("height", "100%")
      .style("width", "100%")
      .attr("id", variable+"-graph")
      .append("div")
      .classed("mdl-spinner mdl-js-spinner is-active center", true)
      .attr("id", variable+"-graph-spinner");

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

  if (options.y_axis_ticks) {
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

  if (options.points) {
    document.getElementById(variable+"-plot-points-toggle").checked = true;
  }

  $("#"+variable+"-plot-points-toggle").on("change", function(){togglePoints(variable);});

  label.append("span")
       .classed("mdl-switch__label", true)
       .text("Plot points");

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

  if (options.confint) {
    document.getElementById(variable+"-plot-confint-toggle").checked = true;
  }

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
         .attr("value", options.smoothing)
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

  callMakeGraph(options);
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

function callMakeGraph(options){
  if (options.variable == "Sleep") {
    getActivity("com.google.activity.segment", "day", function() {
      calcSleepTimeData(all_data);
      makeGraph(all_data.sleeptime, options.variable + options.index + "-graph", options);
      updatePreferences();
    });
  } else if (options.variable == "Weight") {
    getWeight(function(){
      makeGraph(all_data.weight_data, options.variable + options.index + "-graph", options);
      updatePreferences();
    });
  } else if (options.variable == "Active-time") {
    getActivity("com.google.activity.segment", "day", function() {
      calcActiveTimeData(all_data);
      makeGraph(all_data.activetime, options.variable + options.index+"-graph", options);
      updatePreferences();
    });
  } else if (options.variable == "Steps") {
    getActivity("com.google.step_count.delta", "day", function() {
      calcStepCount(all_data);
      makeGraph(all_data.stepcount, options.variable + options.index+"-graph", options);
      updatePreferences();
    });
  } else if (options.variable == "Distance") {
    getActivity("com.google.distance.delta", "day", function() {
      calcDistanceTotal(all_data);
      makeGraph(all_data.totaldistance, options.variable + options.index+"-graph", options);
      updatePreferences();
    });
  }
}

function toggleConfInt(variable) {
  var g = graphs[variable+"-graph"];
  g.options.confint = !g.options.confint;
  g.vis.remove();
  d3.select("#"+variable+"-graph")
    .append("div")
    .classed("mdl-spinner mdl-js-spinner is-active center", true)
    .attr("id", variable+"-graph-spinner");
  callMakeGraph(g.options);
}

function togglePoints(variable) {
  var g = graphs[variable+"-graph"];
  g.options.points = !g.options.points;
  g.vis.remove();
  d3.select("#"+variable+"-graph")
    .append("div")
    .classed("mdl-spinner mdl-js-spinner is-active center", true)
    .attr("id", variable+"-graph-spinner");
  callMakeGraph(g.options);
}

function toggleYAxis(variable) {
  var g = graphs[variable+"-graph"];
  g.options.y_axis_ticks = !g.options.y_axis_ticks;
  g.vis.remove();
  d3.select("#"+variable+"-graph")
    .append("div")
    .classed("mdl-spinner mdl-js-spinner is-active center", true)
    .attr("id", variable+"-graph-spinner");
  callMakeGraph(g.options);
}

function updateSmoothness(variable) {
  var g = graphs[variable+"-graph"];
  g.options.smoothing = document.getElementById(variable+"-smoothness-slider").value;
  g.vis.remove();
  d3.select("#"+variable+"-graph")
    .append("div")
    .classed("mdl-spinner mdl-js-spinner is-active center", true)
    .attr("id", variable+"-graph-spinner");
  callMakeGraph(g.options);
}

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

function getActivity(type, timeunit, callback){
  if (!all_data[type]) {
    all_data[type] = {}
  } else if (all_data[type][timeunit]) {
    callback();
    return;
  }

  var activity_data = gapi.client.request({
    "path" : "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    "method" : "POST",
    "body":{
      "aggregateBy": [
        {
          "dataTypeName": type
        }
      ],
      "endTimeMillis": Date.now(),
      "startTimeMillis": Date.now() - (30*DAY),
      "bucketByTime": {
        "period": {
          "type": timeunit,
          "value": 1,
          "timeZoneId": moment.tz.guess()
        }
      }
    }
  });
  activity_data.then(function(response){
    all_data[type][timeunit] = response.result.bucket;
    callback();
  }, function(reason) {
    console.log('Error: ' + reason.result.error.message);
  });
}


function updatePreferences() {
  $.ajax("http://www.stability-app.com/update_settings", {
      type:"POST",
      contentType:"application/json",
      data:JSON.stringify({"user":id_token,
                           "value":JSON.stringify([graphs, d3.select("#safe-mode-switch").property("checked")])
                         }),
      success:function() {console.log("preferences updated");},
      error: function() {console.log("failed to update preferences");}
  });
}

function getPreferences() {
  $.ajax("http://www.stability-app.com/get_settings", {
      type:"POST",
      contentType:"application/json",
      data:JSON.stringify({"user":id_token}),
      success:function(settings) {restoreSettings(settings);},
      error: function() {console.log("failed to get preferences");}
  });
}

function restoreSettings(settings) {
  res = JSON.parse(settings);
  graphs = res[0];
  for (graph in graphs) {
    addCard(graphs[graph].options.variable, graphs[graph].options);
  }
  if (res[1]) {
    d3.select("#safe-mode-switch").property("checked", true);
  } else {
    d3.select("#safe-mode-switch").property("checked", false);
  }
}
