function makeGraph(data, svg_id, options){
  // Based on https://github.com/jasondavies/science.js/blob/master/examples/loess/loess.js


  var id_without_hash = svg_id;
  svg_id = "#" + svg_id;

  d3.select(svg_id+"-spinner").remove();

  var w = document.getElementById(id_without_hash).offsetWidth,
      h = document.getElementById(id_without_hash).offsetHeight,
      p = 35.5,
      n = 100;

  w -= 2*p; //margins need to come out of width
  h -= 2*p; //margins need to come out of width

  var min_band = 2/data.length;

  var loess = science.stats.loess().bandwidth(d3.max([min_band, options.smoothing]));

  var zipped_data = d3.transpose(data);
  var original_data = d3.transpose(data);
  var loess_result = loess(zipped_data[0], zipped_data[1]);

  zipped_data[1] = loess_result.loess;
  zipped_data.push(loess_result.confint);
  data = d3.zip(zipped_data[0], zipped_data[1], zipped_data[2], original_data[1]);

  max_y = d3.max(data, function(d){return d[2] ? d3.max([d[1]+d[2], d[3]]) : d3.max([d[1], d[3]]);});
  min_y = d3.min(data, function(d){return d[2] ? d3.min([d[1]-d[2], d[3]]) : d3.min([d[1], d[3]]);});

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
       .data(data)
       .enter()
       .append("circle")
       .attr("r", 5)
       .attr("cx", function(d){return x(d[0]);})
       .attr("cy", function(d){return y(d[3]);});
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


// Data munging

function calcSleepTimeData(all_data){
  if (all_data.sleeptime) {
    return;
  }
  sleep_data = [];
  for (i in all_data["com.google.activity.segment"]["day"]) {
    if (all_data["com.google.activity.segment"]["day"][i].dataset[0].point.length > 0) {
      sleep_data.push([new Date(+all_data["com.google.activity.segment"]["day"][i].dataset[0].point[0].startTimeNanos/1000000), 0]);
    }
    for (j in all_data["com.google.activity.segment"]["day"][i].dataset[0].point){
      if (SLEEP_NUMBERS.includes(+all_data["com.google.activity.segment"]["day"][i].dataset[0].point[j].value[0].intVal)) {
        sleep_data[sleep_data.length-1][1] += +all_data["com.google.activity.segment"]["day"][i].dataset[0].point[j].value[1].intVal/3600000;
      }
    }
  }
  all_data.sleeptime = sleep_data;
}

function calcActiveTimeData(all_data){
  if (all_data.activetime) {
    return;
  }

  data = [];
  for (i in all_data["com.google.activity.segment"]["day"]) {
    if (all_data["com.google.activity.segment"]["day"][i].dataset[0].point.length > 0) {
      data.push([new Date(+all_data["com.google.activity.segment"]["day"][i].dataset[0].point[0].startTimeNanos/1000000), 0]);
    }
    for (j in all_data["com.google.activity.segment"]["day"][i].dataset[0].point){
      if (!NON_ACTIVE_NUMBERS.includes(+all_data["com.google.activity.segment"]["day"][i].dataset[0].point[j].value[0].intVal)) {
        data[data.length-1][1] += +all_data["com.google.activity.segment"]["day"][i].dataset[0].point[j].value[1].intVal/3600000;
      }
    }
  }
  all_data.activetime = data;
}

function calcActiveTimeData(all_data){
  if (all_data.stepcount) {
    return;
  }
  concsoole.log(all_data)
  data = [];
  for (i in all_data["com.google.step_count.delta"]["day"]) {
    if (all_data["com.google.step_count.delta"]["day"][i].dataset[0].point.length > 0) {
      data.push([new Date(+all_data["com.google.step_count.delta"]["day"][i].dataset[0].point[0].startTimeNanos/1000000), 0]);
    }
    for (j in all_data["com.google.step_count.delta"]["day"][i].dataset[0].point){
      if (!NON_ACTIVE_NUMBERS.includes(+all_data["com.google.step_count.delta"]["day"][i].dataset[0].point[j].value[0].intVal)) {
        data[data.length-1][1] += +all_data["com.google.step_count.delta"]["day"][i].dataset[0].point[j].value[1].intVal/3600000;
      }
    }
  }
  all_data.stepcount = data;
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
