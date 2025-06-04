
// // global.js

// const mouseSelect    = document.getElementById("mouse-select");
// const startButton    = document.getElementById("start-button");
// const pauseButton    = document.getElementById("pause-button");
// const endButton      = document.getElementById("end-button");
// const restartButton  = document.getElementById("restart-button");
// const raceContainer  = document.getElementById("race-container");
// const presetButtons  = document.querySelectorAll(".preset-btn");
// const customRow      = document.querySelector(".custom-row");


// const femaleLeaderboardOL = document.querySelector("#female-leaderboard ol");
// const maleLeaderboardOL   = document.querySelector("#male-leaderboard ol")

// // dataMap: { id: [ { minute, activity, temperature }, … ] }
// const dataMap = {};
// let femaleIDs = [];
// let maleIDs = [];

// // Load all four CSVs in parallel
// Promise.all([
//   d3.csv("data/Mouse_Fem_Act.csv"),
//   d3.csv("data/Mouse_Fem_Temp.csv"),
//   d3.csv("data/Mouse_Male_Act.csv"),
//   d3.csv("data/Mouse_Male_Temp.csv"),
// ]).then(([fAct, fTemp, mAct, mTemp]) => {
//   buildDataMap(fAct, fTemp, true);
//   buildDataMap(mAct, mTemp, false);

//   computeAverages();
//   populateSelect();

//   // Enable Start button once data is ready
//   startButton.disabled = false;
// });

// function buildDataMap(actCSV, tempCSV, isFemale) {
//   const numMinutes = actCSV.length;
//   const ids = Object.keys(actCSV[0]);

//   if (isFemale) {
//     femaleIDs = ids.slice();
//   } else {
//     maleIDs = ids.slice();
//   }

//   ids.forEach((id) => {
//     if (!dataMap[id]) {
//       dataMap[id] = new Array(numMinutes);
//     }
//   });

//   actCSV.forEach((row, minuteIdx) => {
//     ids.forEach((id) => {
//       const actVal = +row[id];
//       dataMap[id][minuteIdx] = {
//         minute: minuteIdx,
//         activity: actVal,
//         temperature: null,
//       };
//     });
//   });

//   tempCSV.forEach((row, minuteIdx) => {
//     ids.forEach((id) => {
//       const tempVal = +row[id];
//       dataMap[id][minuteIdx].temperature = tempVal;
//     });
//   });
// }

// function computeAverages() {
//   const totalMinutes = dataMap[femaleIDs[0]].length;

//   dataMap["AVG_FEMALE"] = new Array(totalMinutes);
//   dataMap["AVG_MALE"] = new Array(totalMinutes);

//   for (let i = 0; i < totalMinutes; i++) {
//     let fActSum = 0, fTempSum = 0;
//     femaleIDs.forEach((id) => {
//       fActSum += dataMap[id][i].activity;
//       fTempSum += dataMap[id][i].temperature;
//     });
//     const fCount = femaleIDs.length;
//     dataMap["AVG_FEMALE"][i] = {
//       minute: i,
//       activity: fActSum / fCount,
//       temperature: fTempSum / fCount,
//     };

//     let mActSum = 0, mTempSum = 0;
//     maleIDs.forEach((id) => {
//       mActSum += dataMap[id][i].activity;
//       mTempSum += dataMap[id][i].temperature;
//     });
//     const mCount = maleIDs.length;
//     dataMap["AVG_MALE"][i] = {
//       minute: i,
//       activity: mActSum / mCount,
//       temperature: mTempSum / mCount,
//     };
//   }
// }

// function populateSelect() {
//   mouseSelect.innerHTML = "";

//   const aggFemOpt = new Option("▶ Average Female", "AVG_FEMALE");
//   const aggMalOpt = new Option("▶ Average Male", "AVG_MALE");
//   mouseSelect.appendChild(aggFemOpt);
//   mouseSelect.appendChild(aggMalOpt);

//   femaleIDs.forEach((id) => {
//     const opt = new Option(`♀ ${id}`, id);
//     mouseSelect.appendChild(opt);
//   });
//   maleIDs.forEach((id) => {
//     const opt = new Option(`♂ ${id}`, id);
//     mouseSelect.appendChild(opt);
//   });
// }

// const T_SURGE_THRESHOLD = 37.5;   // °C at which mouse “blushes”
// const TEMP_SIGMOID_K    = 1.0;    // steepness of temperature’s effect
// const SPEED_SCALE       = 0.1;    // pixels per tick scaling
// const WHEEL_ROTATE_SCALE= 12;     // leftover from previous version (unused now)

// let selectedIDs = [];
// let racers      = [];  // each: { id, domEl, bodyEl, labelEl, timeIndex, posX }
// let raceTimer   = null;
// let isRunning   = false;

// // Helper: mark an <option> as selected by its value
// function selectOption(val) {
//   const opt = mouseSelect.querySelector(`option[value="${val}"]`);
//   if (opt) opt.selected = true;
// }

// // If user picks from <select> manually, enable Start
// mouseSelect.addEventListener("change", () => {
//   startButton.disabled = mouseSelect.selectedOptions.length === 0;
// });

// // Handle preset clicks; auto‐select options and render mice immediately
// presetButtons.forEach(btn => {
//   btn.addEventListener("click", () => {
//     const preset = btn.dataset.preset; // "HALF", "AVG", "ALLF", "ALLM", or "CUSTOM"

//     // Clear prior selections and hide custom list
//     Array.from(mouseSelect.options).forEach(opt => opt.selected = false);
//     customRow.classList.add("hidden");

//     switch (preset) {
//       case "HALF": {
//         const halfFem = Math.floor(femaleIDs.length / 2);
//         const halfMal = Math.floor(maleIDs.length / 2);
//         femaleIDs.slice(0, halfFem).forEach(id => selectOption(id));
//         maleIDs.slice(0, halfMal).forEach(id => selectOption(id));
//         break;
//       }
//       case "AVG":
//         selectOption("AVG_FEMALE");
//         selectOption("AVG_MALE");
//         break;
//       case "ALLF":
//         femaleIDs.forEach(id => selectOption(id));
//         break;
//       case "ALLM":
//         maleIDs.forEach(id => selectOption(id));
//         break;
//       case "CUSTOM":
//         // Show the <select multiple>
//         customRow.classList.remove("hidden");
//         break;
//     }

//     // At least one selection → enable Start
//     const anySelected = Array.from(mouseSelect.selectedOptions).length > 0;
//     startButton.disabled = !anySelected;

//     // Immediately render the mice (race track) with no animation yet
//     // Clear out any prior racers/tracks
//     clearExistingRacersAndTracks();
//     if (anySelected) {
//       selectedIDs = Array.from(mouseSelect.selectedOptions).map(opt => opt.value);
//       setupRacers(); // show the mice in their lanes (posX = 0)
//     }
//   });
// });

// // Clear any existing racer elements & tracks/finish line
// function clearExistingRacersAndTracks() {
//   racers.forEach(r => raceContainer.removeChild(r.domEl));
//   racers = [];
//   const existingTracks = raceContainer.querySelectorAll(".racer-track");
//   existingTracks.forEach(t => raceContainer.removeChild(t));
//   const existingFinish = raceContainer.querySelector(".finish-line");
//   if (existingFinish) raceContainer.removeChild(existingFinish);
// }

// // START button
// startButton.addEventListener("click", () => {
//   selectedIDs = Array.from(mouseSelect.selectedOptions).map(opt => opt.value);
//   if (selectedIDs.length === 0) {
//     alert("Please select at least one mouse (or average).");
//     return;
//   }

//   mouseSelect.disabled = true;
//   startButton.disabled = true;
//   pauseButton.disabled = false;
//   endButton.disabled = false;
//   restartButton.disabled = true;
//   pauseButton.textContent = "⏸ Pause";

//   // If they clicked Start without having clicked a preset just now,
//   // make sure we have tracks/mice displayed:
//   clearExistingRacersAndTracks();
//   setupRacers();

//   isRunning = true;
//   raceTimer = setInterval(raceStep, 50);
// });

// // PAUSE / RESUME button
// pauseButton.addEventListener("click", () => {
//   if (isRunning) {
//     clearInterval(raceTimer);
//     isRunning = false;
//     pauseButton.textContent = "▶️ Resume";
//   } else {
//     raceTimer = setInterval(raceStep, 50);
//     isRunning = true;
//     pauseButton.textContent = "⏸ Pause";
//   }
// });

// // END button: stops the race (no auto‐restart)
// endButton.addEventListener("click", () => {
//   if (raceTimer) clearInterval(raceTimer);
//   isRunning = false;
//   pauseButton.disabled = true;
//   endButton.disabled = true;
//   restartButton.disabled = false;
// });

// // RESTART button: clear everything, re‐enable presets/custom
// restartButton.addEventListener("click", () => {
//   resetRace();
// });

// // ----------------------
// // 6) setupRacers(): create tracks, finish line, and render mice at posX=0
// // ----------------------
// function setupRacers() {
//   // 1) Decide a wider base width so finish line is visible
//   //    e.g. base 400px + 200px per mouse
//   const baseWidth = 400;
//   const perRacerExtra = 200;
//   const totalWidth = baseWidth + perRacerExtra * selectedIDs.length;
//   raceContainer.style.width = totalWidth + "px";

//   // 2) Add a vertical finish line at far right
//   const finish = document.createElement("div");
//   finish.classList.add("finish-line");
//   finish.style.left = (totalWidth - 4) + "px"; // 4px = .finish-line width
//   raceContainer.appendChild(finish);

//   // 3) Create one track per mouse
//   const laneCount = selectedIDs.length;
//   const trackHeight = Math.floor(raceContainer.clientHeight / laneCount);

//   selectedIDs.forEach((id, idx) => {
//     // 3a) Track background
//     const track = document.createElement("div");
//     track.classList.add("racer-track");
//     track.style.height = trackHeight + "px";
//     track.style.bottom = (idx * trackHeight) + "px";
//     raceContainer.appendChild(track);

//     // 3b) Racer container
//     const racerDiv = document.createElement("div");
//     racerDiv.classList.add("racer");
//     // Position vertically: top of this track minus mouse+label total height (≈70px)
//     const racerBottom = idx * trackHeight + (trackHeight - 70);
//     racerDiv.style.bottom = racerBottom + "px";
//     racerDiv.style.left = "0px";

//     // 3c) “Mouse” icon = a colored circle
//     const mouseBody = document.createElement("div");
//     mouseBody.classList.add("mouse-body");
//     // male vs. female
//     if (id === "AVG_FEMALE" || id.startsWith("f")) {
//       mouseBody.classList.add("mouse-female");
//     } else {
//       mouseBody.classList.add("mouse-male");
//     }

//     // 3d) Label
//     const labelDiv = document.createElement("div");
//     labelDiv.classList.add("racer-label");
//     labelDiv.textContent = id.replace("AVG_", "Average ");

//     // 3e) Append in order: circle then label
//     racerDiv.appendChild(mouseBody);
//     racerDiv.appendChild(labelDiv);
//     raceContainer.appendChild(racerDiv);

//     // 3f) Initialize state
//     const racerState = {
//       id,
//       domEl: racerDiv,
//       bodyEl: mouseBody,
//       timeIndex: 0,
//       posX: 0,
//       finished: false
//     };

//     // 3g) Tippy tooltip on hover
//     tippy(mouseBody, {
//       content: "",
//       allowHTML: true,
//       placement: "top",
//       onShow(instance) {
//         const series = dataMap[racerState.id];
//         const idxMin = Math.min(racerState.timeIndex, series.length - 1);
//         const { activity, temperature, minute } = series[idxMin];
//         instance.setContent(`
//           <strong>ID:</strong> ${racerState.id}<br>
//           <strong>Minute:</strong> ${minute}<br>
//           <strong>Activity:</strong> ${activity.toFixed(2)}<br>
//           <strong>Temp:</strong> ${temperature.toFixed(2)} °C
//         `);
//       }
//     });

//     racers.push(racerState);
//   });
// }

// // ----------------------
// //  raceStep(): advance each mouse, detect finish, update leaderboards
// // ----------------------
// function raceStep() {
//   const containerWidth = raceContainer.clientWidth;
//   let anyRunning = false;

//   racers.forEach(r => {
//     const series = dataMap[r.id];
//     if (!series || r.timeIndex >= series.length || r.finished) return;

//     const { activity: rawAct, temperature: rawTemp } = series[r.timeIndex];
//     const z = rawTemp - T_SURGE_THRESHOLD;
//     const sigmoid = 1 / (1 + Math.exp(-TEMP_SIGMOID_K * z));
//     const tempFactor = 1 - 0.7 * sigmoid;
//     const speed = rawAct * tempFactor * SPEED_SCALE;

//     // Blush logic
//     if (rawTemp > T_SURGE_THRESHOLD + 0.2) {
//       r.bodyEl.classList.add("blush");
//     } else {
//       r.bodyEl.classList.remove("blush");
//     }

//     r.posX += speed;

//     // Animate horizontal movement
//     anime({
//       targets: r.domEl,
//       left: `${r.posX}px`,
//       duration: 45,
//       easing: "linear",
//     });

//     //  If it has just crossed the finish line, mark finished and update leaderboard
//     if (r.posX >= containerWidth - 50 && !r.finished) {
//       r.finished = true;
//       if (r.id === "AVG_FEMALE" || r.id.startsWith("f")) {
//         const li = document.createElement("li");
//         li.textContent = r.id;
//         femaleLeaderboardOL.appendChild(li);
//       } else {
//         const li = document.createElement("li");
//         li.textContent = r.id;
//         maleLeaderboardOL.appendChild(li);
//       }
//     }

//     r.timeIndex++;
//     if (r.posX < containerWidth - 50) {
//       anyRunning = true;
//     }
//   });

//   if (!anyRunning) {
//     clearInterval(raceTimer);
//     isRunning = false;
//     pauseButton.disabled = true;
//     endButton.disabled = true;
//     restartButton.disabled = false;
//   }
// }

// // ----------------------
// //  resetRace(): clear DOM & re‐enable controls
// // ----------------------
// function resetRace() {
//   if (raceTimer) clearInterval(raceTimer);
//   isRunning = false;

//   // Remove racer DIVs
//   racers.forEach(r => raceContainer.removeChild(r.domEl));
//   racers = [];

//   // Remove all tracks & finish line
//   raceContainer.querySelectorAll(".racer-track").forEach(t => {
//     raceContainer.removeChild(t);
//   });
//   const fline = raceContainer.querySelector(".finish-line");
//   if (fline) raceContainer.removeChild(fline);

//   // Clear leaderboards
//   femaleLeaderboardOL.innerHTML = "";
//   maleLeaderboardOL.innerHTML   = "";

//   // Reset controls
//   mouseSelect.disabled = false;
//   startButton.disabled = false;
//   pauseButton.disabled = true;
//   endButton.disabled = true;
//   restartButton.disabled = true;
//   pauseButton.textContent = "⏸ Pause";
// }

// // ----------------------
// // Verify that libraries loaded
// // ----------------------
// (() => {
//   if (typeof window.d3    === 'undefined') console.warn('D3.js did not load.');
//   if (typeof window.anime === 'undefined') console.warn('Anime.js did not load.');
//   if (typeof window.tippy === 'undefined') console.warn('Tippy.js did not load.');
// })();
// global.js

// global.js
const startButton    = document.getElementById("start-button");
const pauseButton    = document.getElementById("pause-button");
const endButton      = document.getElementById("end-button");
const restartButton  = document.getElementById("restart-button");
const raceContainer  = document.getElementById("race-container");
const presetButtons  = document.querySelectorAll(".preset-btn");
const customRow      = document.querySelector(".custom-row");
const checkboxPanel  = document.getElementById("mouse-checkboxes");

const femaleLeaderboardOL = document.querySelector("#female-leaderboard ol");
const maleLeaderboardOL   = document.querySelector("#male-leaderboard ol");

const dataMap = {};
let femaleIDs = [];
let maleIDs = [];

Promise.all([
  d3.csv("data/Mouse_Fem_Act.csv"),
  d3.csv("data/Mouse_Fem_Temp.csv"),
  d3.csv("data/Mouse_Male_Act.csv"),
  d3.csv("data/Mouse_Male_Temp.csv"),
]).then(([fAct, fTemp, mAct, mTemp]) => {
  buildDataMap(fAct, fTemp, true);
  buildDataMap(mAct, mTemp, false);
  computeAverages();
  populateCheckboxes();
  startButton.disabled = true;
});

function buildDataMap(actCSV, tempCSV, isFemale) {
  const numMinutes = actCSV.length;
  const ids = Object.keys(actCSV[0]);

  if (isFemale) {
    femaleIDs = ids.slice();
  } else {
    maleIDs = ids.slice();
  }

  ids.forEach(id => {
    if (!dataMap[id]) dataMap[id] = new Array(numMinutes);
  });

  actCSV.forEach((row, i) => {
    ids.forEach(id => {
      dataMap[id][i] = { minute: i, activity: +row[id], temperature: null };
    });
  });

  tempCSV.forEach((row, i) => {
    ids.forEach(id => {
      dataMap[id][i].temperature = +row[id];
    });
  });
}

function computeAverages() {
  const T = dataMap[femaleIDs[0]].length;
  dataMap["AVG_FEMALE"] = Array(T);
  dataMap["AVG_MALE"] = Array(T);

  for (let i = 0; i < T; i++) {
    let fSumA = 0, fSumT = 0;
    femaleIDs.forEach(id => {
      fSumA += dataMap[id][i].activity;
      fSumT += dataMap[id][i].temperature;
    });
    dataMap["AVG_FEMALE"][i] = {
      minute: i,
      activity: fSumA / femaleIDs.length,
      temperature: fSumT / femaleIDs.length,
    };

    let mSumA = 0, mSumT = 0;
    maleIDs.forEach(id => {
      mSumA += dataMap[id][i].activity;
      mSumT += dataMap[id][i].temperature;
    });
    dataMap["AVG_MALE"][i] = {
      minute: i,
      activity: mSumA / maleIDs.length,
      temperature: mSumT / maleIDs.length,
    };
  }
}

function populateCheckboxes() {
  checkboxPanel.innerHTML = "";

  const makeCB = (id, label) => {
    const lbl = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = id;
    lbl.appendChild(input);
    lbl.append(label);
    return lbl;
  };

  checkboxPanel.appendChild(makeCB("AVG_FEMALE", "▶ Average Female"));
  checkboxPanel.appendChild(makeCB("AVG_MALE", "▶ Average Male"));

  femaleIDs.forEach(id => checkboxPanel.appendChild(makeCB(id, `♀ ${id}`)));
  maleIDs.forEach(id => checkboxPanel.appendChild(makeCB(id, `♂ ${id}`)));

  checkboxPanel.querySelectorAll("input").forEach(cb => {
    cb.addEventListener("change", () => {
      const checked = checkboxPanel.querySelectorAll("input:checked");
      startButton.disabled = checked.length === 0;
    });
  });
}

let selectedIDs = [];
let racers = [];
let raceTimer = null;
let isRunning = false;

presetButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const preset = btn.dataset.preset;
    const cbs = checkboxPanel.querySelectorAll("input");
    cbs.forEach(cb => (cb.checked = false));
    customRow.classList.add("hidden");

    switch (preset) {
      case "HALF":
        femaleIDs.slice(0, Math.floor(femaleIDs.length / 2)).forEach(id => checkCB(id));
        maleIDs.slice(0, Math.floor(maleIDs.length / 2)).forEach(id => checkCB(id));
        break;
      case "AVG":
        checkCB("AVG_FEMALE");
        checkCB("AVG_MALE");
        break;
      case "ALLF":
        femaleIDs.forEach(checkCB);
        break;
      case "ALLM":
        maleIDs.forEach(checkCB);
        break;
      case "CUSTOM":
        customRow.classList.remove("hidden");
        break;
    }

    selectedIDs = getCheckedIDs();
    startButton.disabled = selectedIDs.length === 0;
    clearExistingRacersAndTracks();
    if (selectedIDs.length) setupRacers();
  });
});

function checkCB(id) {
  const cb = checkboxPanel.querySelector(`input[value="${id}"]`);
  if (cb) cb.checked = true;
}

function getCheckedIDs() {
  return Array.from(checkboxPanel.querySelectorAll("input:checked")).map(cb => cb.value);
}

startButton.addEventListener("click", () => {
  selectedIDs = getCheckedIDs();
  if (selectedIDs.length === 0) return alert("Please select at least one mouse.");
  disableControlsForRace();
  clearExistingRacersAndTracks();
  setupRacers();
  isRunning = true;
  raceTimer = setInterval(raceStep, 50);
});

pauseButton.addEventListener("click", () => {
  if (isRunning) {
    clearInterval(raceTimer);
    pauseButton.textContent = "▶️ Resume";
  } else {
    raceTimer = setInterval(raceStep, 50);
    pauseButton.textContent = "⏸ Pause";
  }
  isRunning = !isRunning;
});

endButton.addEventListener("click", () => {
  if (raceTimer) clearInterval(raceTimer);
  isRunning = false;
  pauseButton.disabled = true;
  endButton.disabled = true;
  restartButton.disabled = false;
});

restartButton.addEventListener("click", resetRace);

function disableControlsForRace() {
  startButton.disabled = true;
  pauseButton.disabled = false;
  endButton.disabled = false;
  restartButton.disabled = true;
  pauseButton.textContent = "⏸ Pause";
}

function clearExistingRacersAndTracks() {
  racers.forEach(r => raceContainer.removeChild(r.domEl));
  racers = [];
  raceContainer.querySelectorAll(".racer-track").forEach(t => raceContainer.removeChild(t));
  const finish = raceContainer.querySelector(".finish-line");
  if (finish) raceContainer.removeChild(finish);
}

function resetRace() {
  if (raceTimer) clearInterval(raceTimer);
  isRunning = false;
  clearExistingRacersAndTracks();
  femaleLeaderboardOL.innerHTML = "";
  maleLeaderboardOL.innerHTML = "";
  startButton.disabled = false;
  pauseButton.disabled = true;
  endButton.disabled = true;
  restartButton.disabled = true;
  pauseButton.textContent = "⏸ Pause";
}

const T_SURGE_THRESHOLD = 37.5;
const TEMP_SIGMOID_K = 1.0;
const SPEED_SCALE = 0.1;

function setupRacers() {
  const baseWidth = 400;
  const perRacer = 200;
  const totalWidth = baseWidth + perRacer * selectedIDs.length;
  raceContainer.style.width = totalWidth + "px";

  const finish = document.createElement("div");
  finish.classList.add("finish-line");
  finish.style.left = `${totalWidth - 4}px`;
  raceContainer.appendChild(finish);

  const minTrackHeight = 60; // enough for 36px dot + spacing
  const totalHeight = selectedIDs.length * minTrackHeight;
  raceContainer.style.height = `${totalHeight}px`;
  const trackH = minTrackHeight;


  selectedIDs.forEach((id, idx) => {
    const track = document.createElement("div");
    track.classList.add("racer-track");
    track.style.height = `${trackH}px`;
    track.style.bottom = `${idx * trackH}px`;
    raceContainer.appendChild(track);

    const racerDiv = document.createElement("div");
    racerDiv.classList.add("racer");
    const circleHeight = 36; // same as .mouse-body height
    const centerOffset = (trackH - circleHeight) / 2;
    const racerBottom = idx * trackH + centerOffset;
    racerDiv.style.bottom = `${racerBottom}px`;

    racerDiv.style.left = "0px";

    const mouseBody = document.createElement("div");
    mouseBody.classList.add("mouse-body", id === "AVG_FEMALE" || id.startsWith("f") ? "mouse-female" : "mouse-male");

    const label = document.createElement("div");
    label.classList.add("racer-label-inside");
    label.textContent = id;
    

    mouseBody.appendChild(label);
    racerDiv.appendChild(mouseBody);

    raceContainer.appendChild(racerDiv);

    const rState = {
      id, domEl: racerDiv, bodyEl: mouseBody, timeIndex: 0, posX: 0, finished: false
    };

    tippy(mouseBody, {
      content: "",
      allowHTML: true,
      placement: "top",
      onShow(instance) {
        const s = dataMap[rState.id];
        const i = Math.min(rState.timeIndex, s.length - 1);
        const { activity, temperature, minute } = s[i];
        instance.setContent(`
          <strong>ID:</strong> ${rState.id}<br>
          <strong>Minute:</strong> ${minute}<br>
          <strong>Activity:</strong> ${activity.toFixed(2)}<br>
          <strong>Temp:</strong> ${temperature.toFixed(2)} °C
        `);
      }
    });

    racers.push(rState);
  });
}

function raceStep() {
  const containerWidth = raceContainer.clientWidth;
  let anyRunning = false;

  racers.forEach(r => {
    const s = dataMap[r.id];
    if (!s || r.timeIndex >= s.length || r.finished) return;

    const { activity, temperature } = s[r.timeIndex];
    const z = temperature - T_SURGE_THRESHOLD;
    const sigmoid = 1 / (1 + Math.exp(-TEMP_SIGMOID_K * z));
    const tempFactor = 1 - 0.7 * sigmoid;
    const speed = activity * tempFactor * SPEED_SCALE;

    if (temperature > T_SURGE_THRESHOLD + 0.2) r.bodyEl.classList.add("blush");
    else r.bodyEl.classList.remove("blush");

    r.posX += speed;
    anime({ targets: r.domEl, left: `${r.posX}px`, duration: 45, easing: "linear" });

    if (r.posX >= containerWidth - 50 && !r.finished) {
      r.finished = true;
      const li = document.createElement("li");
      li.textContent = r.id;
      const board = (r.id === "AVG_FEMALE" || r.id.startsWith("f")) ? femaleLeaderboardOL : maleLeaderboardOL;
      board.appendChild(li);
    }

    r.timeIndex++;
    if (r.posX < containerWidth - 50) anyRunning = true;
  });

  if (!anyRunning) {
    clearInterval(raceTimer);
    isRunning = false;
    pauseButton.disabled = true;
    endButton.disabled = true;
    restartButton.disabled = false;
  }
}

(() => {
  if (!window.d3) console.warn("D3.js not loaded.");
  if (!window.anime) console.warn("Anime.js not loaded.");
  if (!window.tippy) console.warn("Tippy.js not loaded.");
})();
