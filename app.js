/* ------------------------------- constants & refs -------------------- */
const leftWheel = document.getElementById('wheelLeft');
const rightWheel = document.getElementById('wheelRight');

const leftTrack = document.getElementById('leftTrack');
const rightTrack = document.getElementById('rightTrack');

const slider = d3.select('#timeSlider');
const playBtn = d3.select('#playPause');
playBtn.text('❚❚');

let selectedMetric = 'Activity';
let leftPosition = 0;
let rightPosition = 0;
const maxX = 550;

/* ------------------------ update title and axis ------------------------ */
function updateTitleAndYAxis() {
  d3.select('h1').text(`Mouse ${selectedMetric} Comparator`);
  yScale.domain(selectedMetric === 'Temp' ? [32, 40] : [0, 70]);
  yAxisG.call(d3.axisLeft(yScale));
}

/* ------------------------------- chart setup ------------------------- */
const chart = d3.select('#chart');
const MARGIN = { top: 20, right: 20, bottom: 25, left: 40 };
const WIDTH = 600 - MARGIN.left - MARGIN.right;
const HEIGHT = 200 - MARGIN.top - MARGIN.bottom;
const chartG = chart.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);
const xScale = d3.scaleLinear().range([0, WIDTH]);
const yScale = d3.scaleLinear().range([HEIGHT, 0]);
const xAxisG = chartG.append('g').attr('class', 'axis').attr('transform', `translate(0,${HEIGHT})`);
const yAxisG = chartG.append('g').attr('class', 'axis');
const lineLeft = chartG.append('path').attr('class', 'line-left');
const lineRight = chartG.append('path').attr('class', 'line-right');
const timeMarker = chartG.append('line')
  .attr('id', 'timeMarker')
  .attr('y1', 0)
  .attr('y2', HEIGHT)
  .attr('stroke', 'black')
  .attr('stroke-width', 2.5)
  .style('cursor', 'ew-resize')
  .call(d3.drag().on('drag', function (event) {
    const [x] = d3.pointer(event, this);
    const minute = Math.round(xScale.invert(x));
    slider.property('value', Math.max(minMinute, Math.min(maxMinute, minute)));
    redraw();
  }));

chartG.append('rect')
  .attr('class', 'overlay')
  .attr('width', WIDTH)
  .attr('height', HEIGHT)
  .style('fill', 'transparent');

function updateTracksAndGender() {
  const l = d3.select('#leftSelect').property('value');
  const r = d3.select('#rightSelect').property('value');

  const lGender = (l === 'ALL_F' || /^f/i.test(l)) ? 'female' : 'male';
  const rGender = (r === 'ALL_F' || /^f/i.test(r)) ? 'female' : 'male';

  leftTrack.className = 'track ' + lGender;
  rightTrack.className = 'track ' + rGender;
  leftWheel.className = 'wheel ' + lGender;
  rightWheel.className = 'wheel ' + rGender;
}

/* ------------------------------- metric selector -------------------- */
d3.select('#metricSelect').on('change', function () {
  selectedMetric = this.value;
  leftPosition = 0;
  rightPosition = 0;
  buildChart(+slider.property('value'));
  redraw();
  updateTitleAndYAxis();
});

/* ------------------------------- data load --------------------------- */
let data, minMinute, maxMinute;

d3.csv('mice_tidy.csv', d3.autoType).then(raw => {
  data = raw;
  minMinute = d3.min(data, d => d.Minute);
  maxMinute = d3.max(data, d => d.Minute);

  slider.attr('min', minMinute).attr('max', maxMinute);
  xScale.domain([minMinute, maxMinute]);
  yScale.domain([0, 70]);
  xAxisG.call(
    d3.axisBottom(xScale).ticks(7).tickFormat(m => `${Math.floor(m / 1440) + 1}D ${Math.floor((m % 1440) / 60)}h`)
  );
  yAxisG.call(d3.axisLeft(yScale));

  chartG.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', WIDTH)
    .attr('height', HEIGHT)
    .attr('fill', '#ffffff');

  const estrusStart = 1440;
  const estrusInterval = 4 * 1440;
  const estrusDuration = 1440;

  for (let t = estrusStart; t <= maxMinute; t += estrusInterval) {
    chartG.append('rect')
      .attr('x', xScale(t))
      .attr('y', 0)
      .attr('width', xScale(t + estrusDuration) - xScale(t))
      .attr('height', HEIGHT)
      .attr('fill', '#ffc0cb')
      .attr('opacity', 0.2);
  }

  populateSelectors();
  buildChart(minMinute);
});

function slopeAt(minute, side) {
  const prev = Math.max(minute - 30, minMinute);
  const next = Math.min(minute + 30, maxMinute);

  const prevVal = meanMetric(filterRows(side, prev)) || 0;
  const nextVal = meanMetric(filterRows(side, next)) || 0;

  return (nextVal - prevVal) / (next - prev);
}

function updatePositions(minute) {
  const leftSlope = slopeAt(minute, 'left');
  const rightSlope = slopeAt(minute, 'right');

  const slopeToSpeed = d3.scaleLinear()
    .domain([-0.1, 0, 0.1])
    .range([0.2, 1.0, 4.0])
    .clamp(true);

  leftPosition += slopeToSpeed(rightSlope);
  rightPosition += slopeToSpeed(leftSlope);

  leftPosition = Math.min(leftPosition, maxX);
  rightPosition = Math.min(rightPosition, maxX);

  leftWheel.style.left = `${leftPosition}px`;
  rightWheel.style.left = `${rightPosition}px`;
}

function populateSelectors() {
  const mice = Array.from(new Set(data.map(d => d.Mouse))).sort();
  const opts = ['ALL_M', 'ALL_F', ...mice];

  d3.selectAll('#leftSelect,#rightSelect')
    .selectAll('option')
    .data(opts)
    .enter()
    .append('option')
    .attr('value', d => d)
    .text(d => ({ ALL_M: 'All Males', ALL_F: 'All Females' }[d] || d.toUpperCase()));

  d3.select('#leftSelect').property('value', mice.find(m => /^m/i.test(m)) || opts[0]);
  d3.select('#rightSelect').property('value', mice.find(m => /^f/i.test(m)) || opts[1]);

  updateTracksAndGender();
  updateTitleAndYAxis();
}

function filterRows(side, minute) {
  const id = d3.select(`#${side}Select`).property('value');
  return data.filter(d =>
    d.Minute === minute &&
    (id === 'ALL_M' ? d.Sex === 'M'
                    : id === 'ALL_F' ? d.Sex === 'F'
                                     : d.Mouse === id)
  );
}

function meanMetric(rows) {
  return d3.mean(rows, d => d[selectedMetric]);
}

function seriesFor(side, maxTime) {
  const id = d3.select(`#${side}Select`).property('value');
  const isMatch = d =>
    id === 'ALL_M' ? d.Sex === 'M'
    : id === 'ALL_F' ? d.Sex === 'F'
                     : d.Mouse === id;

  const grouped = d3.rollups(
    data.filter(d => isMatch(d) && d.Minute <= maxTime),
    v => d3.mean(v, d => d[selectedMetric]),
    d => Math.floor(d.Minute / 30) * 30
  );

  return grouped
    .sort((a, b) => a[0] - b[0])
    .map(([Minute, value]) => ({ Minute, value }));
}

function buildChart(minute = maxMinute) {
  const leftSeries = seriesFor('left', minute);
  const rightSeries = seriesFor('right', minute);

  const lineGen = d3.line()
    .curve(d3.curveMonotoneX)
    .x(d => xScale(d.Minute))
    .y(d => yScale(d.value));

  lineLeft.datum(leftSeries)
    .attr('d', lineGen)
    .attr('stroke', 'blue')
    .attr('fill', 'none')
    .attr('stroke-width', 1.5);

  lineRight.datum(rightSeries)
    .attr('d', lineGen)
    .attr('stroke', 'hotpink')
    .attr('fill', 'none')
    .attr('stroke-width', 1.5);

  updateTitleAndYAxis();
}

function redraw() {
  const minute = +slider.property('value');

  if (minute >= maxMinute) {
    stopPlayback();
    return;
  }

  updatePositions(minute);

  timeMarker
    .attr('x1', xScale(minute))
    .attr('x2', xScale(minute));

  updateTracksAndGender();
  buildChart(minute);

  lineLeft.raise();
  lineRight.raise();
  timeMarker.raise();
}

d3.selectAll('#leftSelect,#rightSelect').on('change', () => {
  leftPosition = 0;
  rightPosition = 0;
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
  leftPosition = 0;
  rightPosition = 0;
  buildChart(+slider.property('value'));
  redraw();
});

let playing = false, timer = null;

function startPlayback() {
  playing = true;
  playBtn.text('❚❚');

  timer = setInterval(() => {
    let t = +slider.property("value");
    if (t + 5 > maxMinute) {
      stopPlayback();
      return;
    }
    t += 5;
    slider.property("value", t);
    redraw();
  }, 100);
}

function stopPlayback() {
  playing = false;
  clearInterval(timer);
  playBtn.text('▶︎');
}

playBtn.on("click", () => {
  if (playing) {
    stopPlayback();
  } else {
    startPlayback();
  }
});
