/* ------------------------------- constants & refs -------------------- */
const leftVid  = document.getElementById('leftVid');
const rightVid = document.getElementById('rightVid');

const slider   = d3.select('#timeSlider');
const playBtn  = d3.select('#playPause');
playBtn.text('❚❚');

const speedScale = d3.scaleLinear().range([0.25, 4]);
let selectedMetric = 'Activity';

// Update page title in the header <h1>
// Update page title in the header <h1>
function updateTitleAndYAxis() {
  d3.select('h1').text(`Mouse ${selectedMetric} Comparator`);
  yScale.domain(selectedMetric === 'Temp' ? [32, 40] : [0, 70]);
  yAxisG.call(d3.axisLeft(yScale));
}

function updateVideoBorders() {
  const l = d3.select('#leftSelect').property('value');
  const r = d3.select('#rightSelect').property('value');

  leftVid.className = 'wheel ' + (l === 'ALL_F' || /^f/i.test(l) ? 'female' : 'male');
  rightVid.className = 'wheel ' + (r === 'ALL_F' || /^f/i.test(r) ? 'female' : 'male');
}

/* ------------------------------- chart setup ------------------------- */
const chart   = d3.select('#chart');
const MARGIN  = {top:20, right:20, bottom:25, left:40};
const WIDTH   = 600 - MARGIN.left - MARGIN.right;
const HEIGHT  = 200 - MARGIN.top  - MARGIN.bottom;
const chartG  = chart.append('g').attr('transform',`translate(${MARGIN.left},${MARGIN.top})`);
const xScale  = d3.scaleLinear().range([0, WIDTH]);
const yScale  = d3.scaleLinear().range([HEIGHT, 0]);
const xAxisG  = chartG.append('g').attr('class','axis').attr('transform',`translate(0,${HEIGHT})`);
const yAxisG  = chartG.append('g').attr('class','axis');
const lineLeft  = chartG.append('path').attr('class','line-left');
const lineRight = chartG.append('path').attr('class','line-right');
const timeMarker= chartG.append('line').attr('id','timeMarker').attr('y1',0).attr('y2',HEIGHT);

chartG.append('rect')
  .attr('class','overlay')
  .attr('width',WIDTH)
  .attr('height',HEIGHT)
  .call(d3.drag().on('drag', ev => {
    const minute = Math.round(xScale.invert(ev.x));
    slider.property('value', Math.max(xScale.domain()[0], Math.min(xScale.domain()[1], minute)));
    redraw();
  }));

/* ------------------------------- metric selector -------------------- */
d3.select('#metricSelect').on('change', function() {
  selectedMetric = this.value;
  buildChart(+slider.property('value'));
  redraw();
  updateTitleAndYAxis();
});

/* ------------------------------- data load --------------------------- */
let data, minMinute, maxMinute;
d3.csv('mice_tidy.csv', d3.autoType).then(raw => {
  data       = raw;
  minMinute  = d3.min(data, d => d.Minute);
  maxMinute  = d3.max(data, d => d.Minute);

  slider.attr('min', minMinute).attr('max', maxMinute);

  xScale.domain([minMinute, maxMinute]);
  yScale.domain([0, 70]);
  xAxisG.call(d3.axisBottom(xScale).ticks(7).tickFormat(m => `${Math.floor(m/1440)+1}D ${Math.floor((m%1440)/60)}h`));
  yAxisG.call(d3.axisLeft(yScale));
  speedScale.domain(d3.extent(data, d => d.Activity));

  const estrusStart = 1440;
  const estrusInterval = 4 * 1440;
  const estrusDuration = 1440;
  for (let t = estrusStart; t <= maxMinute; t += estrusInterval) {
    chartG.append('rect')
      .attr('x', xScale(t))
      .attr('y', 0)
      .attr('width', xScale(t + estrusDuration) - xScale(t))
      .attr('height', HEIGHT)
      .attr('fill', 'pink')
      .attr('opacity', 0.2);
  }

  populateSelectors();
  buildChart(minMinute);
});

function populateSelectors() {
  const mice = Array.from(new Set(data.map(d => d.Mouse))).sort();
  const opts = ['ALL_M','ALL_F',...mice];

  d3.selectAll('#leftSelect,#rightSelect')
    .selectAll('option')
    .data(opts)
    .enter()
    .append('option')
    .attr('value', d => d)
    .text(d => ({ALL_M:'All Males',ALL_F:'All Females'}[d] || d.toUpperCase()));

  d3.select('#leftSelect').property('value', mice.find(m=>/^m/i.test(m)) || opts[0]);
  d3.select('#rightSelect').property('value', mice.find(m=>/^f/i.test(m)) || opts[1]);

  updateVideoBorders();
  updateTitleAndYAxis();
}

function filterRows(side, minute) {
  const id = d3.select(`#${side}Select`).property('value');
  return data.filter(d =>
    d.Minute === minute &&
    (id==='ALL_M' ? d.Sex==='M' : id==='ALL_F' ? d.Sex==='F' : d.Mouse === id));
}

function meanMetric(rows) {
  return d3.mean(rows, d => d[selectedMetric]);
}

function seriesFor(side, maxTime) {
  const id = d3.select(`#${side}Select`).property('value');
  const isMatch = d => id==='ALL_M' ? d.Sex==='M' : id==='ALL_F' ? d.Sex==='F' : d.Mouse === id;

  const grouped = d3.rollups(
    data.filter(d => isMatch(d) && d.Minute <= maxTime),
    v => d3.mean(v, d => d[selectedMetric]),
    d => Math.floor(d.Minute/30)*30
  );

  return grouped.sort((a,b)=>a[0]-b[0]).map(([Minute, value])=>({Minute, value}));
}

function buildChart(minute = maxMinute) {
  const leftSeries  = seriesFor('left', minute);
  const rightSeries = seriesFor('right', minute);

  const lineGen = d3.line()
    .curve(d3.curveMonotoneX)
    .x(d => xScale(d.Minute))
    .y(d => yScale(d.value));

  lineLeft.datum(leftSeries).attr('d', lineGen).attr('stroke', 'blue');
  lineRight.datum(rightSeries).attr('d', lineGen).attr('stroke', 'hotpink');

  updateTitleAndYAxis();
}

function redraw() {
  const minute = +slider.property('value');

  if (!leftVid.paused) {
    leftVid.playbackRate  = speedScale(meanMetric(filterRows('left',  minute)) || 0);
    rightVid.playbackRate = speedScale(meanMetric(filterRows('right', minute)) || 0);
  }

  timeMarker.attr('x1', xScale(minute)).attr('x2', xScale(minute));
  updateVideoBorders();
  buildChart(minute);
}

d3.selectAll('#leftSelect,#rightSelect').on('change', () => {
  buildChart(+slider.property('value'));
  redraw();
});

slider.on('input', redraw);

d3.select('#swap').on('click', () => {
  const l = d3.select('#leftSelect');
  const r = d3.select('#rightSelect');
  const tmp = l.property('value');
  l.property('value', r.property('value'));
  r.property('value', tmp);
  buildChart(+slider.property('value'));
  redraw();
});

let playing = false, timer = null;

function startPlayback() {
  playing = true;
  playBtn.text('❚❚');
  leftVid.play();
  rightVid.play();

  timer = setInterval(() => {
    const s = slider;
    let t = +s.property("value");
    t = (t + 5 > maxMinute) ? minMinute : t + 5;
    s.property("value", t);
    redraw(); // Updates video speed, line chart, time marker
  }, 100); // 10 fps for smooth updates
}



function stopPlayback() {
  playing = false;
  clearInterval(timer);
  leftVid.pause();
  rightVid.pause();
  playBtn.text('▶︎');
}

playBtn.on("click", () => {
  playBtn.text('▶︎');
  if (playing) {
    stopPlayback();
  } else {
    startPlayback();
  }
});

