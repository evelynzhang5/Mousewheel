/* ------------------------------- constants & refs -------------------- */
const leftVid  = document.getElementById('leftVid');
const rightVid = document.getElementById('rightVid');

const slider   = d3.select('#timeSlider');
const playBtn  = d3.select('#playPause');

playBtn.text('❚❚');               // show pause symbol by default

const speedScale = d3.scaleLinear().range([0.25, 4]);   // Activity → video speed

/* ------------------------------- chart setup ------------------------- */
const chart   = d3.select('#chart');
const MARGIN  = {top:20, right:20, bottom:25, left:40};
const WIDTH   = 600 - MARGIN.left - MARGIN.right;
const HEIGHT  = 200 - MARGIN.top  - MARGIN.bottom;

const chartG  = chart.append('g')
                     .attr('transform',`translate(${MARGIN.left},${MARGIN.top})`);

const xScale  = d3.scaleLinear().range([0, WIDTH]);
const yScale  = d3.scaleLinear().range([HEIGHT, 0]);

const xAxisG  = chartG.append('g').attr('class','axis')
                      .attr('transform',`translate(0,${HEIGHT})`);
const yAxisG  = chartG.append('g').attr('class','axis');

const lineLeft  = chartG.append('path').attr('class','line-left');
const lineRight = chartG.append('path').attr('class','line-right');
const timeMarker= chartG.append('line').attr('id','timeMarker')
                                  .attr('y1',0).attr('y2',HEIGHT);

/* drag overlay to set time */
chartG.append('rect')
      .attr('class','overlay')
      .attr('width',WIDTH)
      .attr('height',HEIGHT)
      .call(d3.drag()
        .on('drag', ev=>{
          const minute = Math.round(xScale.invert(ev.x));
          slider.property('value',
            Math.max(xScale.domain()[0], Math.min(xScale.domain()[1], minute)));
          redraw();
        }));

/* ------------------------------- data load --------------------------- */
let data, minMinute, maxMinute;
d3.csv('mice_tidy.csv', d3.autoType).then(raw=>{
  data       = raw;
  minMinute  = d3.min(data,d=>d.Minute);
  maxMinute  = d3.max(data,d=>d.Minute);

  slider.attr('min',minMinute).attr('max',maxMinute);

  /* tick formatter: 'v D, w H' */
  const fmt = m=>{
    const day  = Math.floor(m/1440) + 1;          // 0-based → 1-based
    const hour = Math.floor((m%1440)/60);
    return `${day}D ${hour}h`;
  };

  xScale.domain([minMinute, maxMinute]);
  yScale.domain([0, 70]);

  xAxisG.call(d3.axisBottom(xScale).ticks(7).tickFormat(fmt));
  yAxisG.call(d3.axisLeft (yScale));

  speedScale.domain(d3.extent(data,d=>d.Activity));

  populateSelectors();
  buildChart();            // initial lines
  startPlayback();         // begin running immediately
});

/* ------------------------------- populate selects -------------------- */
function populateSelectors(){
  const mice = Array.from(new Set(data.map(d=>d.Mouse))).sort();
  const opts = ['ALL_M','ALL_F',...mice];

  d3.selectAll('#leftSelect,#rightSelect')
    .selectAll('option')
    .data(opts)
    .enter()
    .append('option')
    .attr('value',d=>d)
    .text(d=>({ALL_M:'All Males',ALL_F:'All Females'}[d]||d.toUpperCase()));

  const males   = mice.find(m=>/^m\d+/i.test(m)) || opts[0];
  const females = mice.find(m=>/^f\d+/i.test(m)) || opts[1];

  d3.select('#leftSelect').property('value',males);
  d3.select('#rightSelect').property('value',females);
}

/* ------------------------------- helpers ----------------------------- */
function filterRows(side, minute){
  const id = d3.select(`#${side}Select`).property('value');
  return data.filter(d =>
    d.Minute === minute &&
    (id==='ALL_M' ? d.Sex==='M'
     : id==='ALL_F'? d.Sex==='F'
     : d.Mouse===id));
}

function meanActivity(rows){
  return d3.mean(rows, d=>d.Activity);
}

/* -------- build series, 30-min bins for smooth chart ----------------- */
function seriesFor(side){
  const id = d3.select(`#${side}Select`).property('value');
  const isMatch = d=>(
      id==='ALL_M' ? d.Sex==='M'
    : id==='ALL_F' ? d.Sex==='F'
    : d.Mouse===id );

  const grouped = d3.rollups(
      data.filter(isMatch),
      v=>d3.mean(v,d=>d.Activity),
      d=> Math.floor(d.Minute/30)*30   // bin start
  );

  return grouped.sort((a,b)=>a[0]-b[0])
                .map(([Minute,Activity])=>({Minute,Activity}));
}

function buildChart(){
  const leftSeries  = seriesFor('left');
  const rightSeries = seriesFor('right');

  const lineGen = d3.line()
                    .curve(d3.curveMonotoneX)
                    .x(d=>xScale(d.Minute))
                    .y(d=>yScale(d.Activity));

  lineLeft .attr('d', lineGen(leftSeries));
  lineRight.attr('d', lineGen(rightSeries));
}

/* ------------------------------- redraw ------------------------------ */
function redraw(){
  const minute = +slider.property('value');

  if(!leftVid.paused){
    leftVid.playbackRate  = speedScale(meanActivity(filterRows('left',  minute))||0);
    rightVid.playbackRate = speedScale(meanActivity(filterRows('right', minute))||0);
  }

  timeMarker.attr('x1', xScale(minute)).attr('x2', xScale(minute));
}

/* ------------------------------- events ------------------------------ */
d3.selectAll('#leftSelect,#rightSelect')
  .on('change', ()=>{
    buildChart();
    redraw();
  });

slider.on('input', redraw);

d3.select('#swap').on('click',()=>{
  const l=d3.select('#leftSelect'), r=d3.select('#rightSelect');
  const tmp=l.property('value');
  l.property('value',r.property('value'));
  r.property('value',tmp);
  buildChart();
  redraw();
});

/* --------------------------- play / pause logic ---------------------- */
let playing=true, timer=null;

function startPlayback(){
  leftVid.play();
  rightVid.play();
  redraw();                                   // set initial playbackRate
  timer=setInterval(()=>{
    let t = +slider.property('value') + 5;    // +5 minutes per tick
    if(t>maxMinute) t=minMinute;
    slider.property('value',t);
    redraw();
  },1000);                                    // 1 s real time
}

function stopPlayback(){
  clearInterval(timer);
  leftVid.pause();
  rightVid.pause();
}

playBtn.on('click',()=>{
  playing=!playing;
  playBtn.text(playing?'❚❚':'▶︎');
  if(playing) startPlayback(); else stopPlayback();
});
