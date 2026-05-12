const chromaticSharp = ["C", "#C", "D", "#D", "E", "F", "#F", "G", "#G", "A", "#A", "B"];
const chromaticFlat = ["C", "bD", "D", "bE", "E", "F", "bG", "G", "bA", "A", "bB", "B"];
const naturalMajorSteps = [2, 2, 1, 2, 2, 2, 1];
const degreeOffsets = [0, 2, 4, 5, 7, 9, 11, 12];
const tonicOptions = [
  { index: 0, label: "C" },
  { index: 1, label: "#C / bD" },
  { index: 2, label: "D" },
  { index: 3, label: "#D / bE" },
  { index: 4, label: "E" },
  { index: 5, label: "F" },
  { index: 6, label: "#F / bG" },
  { index: 7, label: "G" },
  { index: 8, label: "#G / bA" },
  { index: 9, label: "A" },
  { index: 10, label: "#A / bB" },
  { index: 11, label: "B" },
];

const keyboard = document.querySelector("#keyboard");
const ruler = document.querySelector("#ruler");
const scrollShell = document.querySelector("#scrollShell");
const tonicSelect = document.querySelector("#tonicSelect");
const sharpMode = document.querySelector("#sharpMode");
const flatMode = document.querySelector("#flatMode");
const scaleTitle = document.querySelector("#scaleTitle");
const scaleList = document.querySelector("#scaleList");

let tonicIndex = 0;
let tonicPosition = 12;
let namingMode = "sharp";
let stepWidth = 88;
let isDragging = false;
let dragStartX = 0;
let dragStartLeft = 0;

function getStepWidth() {
  const firstKey = keyboard.querySelector(".key");
  return firstKey ? firstKey.getBoundingClientRect().width : stepWidth;
}

function activeNames() {
  return namingMode === "sharp" ? chromaticSharp : chromaticFlat;
}

function isAccidental(index) {
  return [1, 3, 6, 8, 10].includes(index % 12);
}

function splitLabel(index) {
  const sharp = chromaticSharp[index % 12];
  const flat = chromaticFlat[index % 12];
  return sharp === flat ? [sharp] : [sharp, flat];
}

function renderKeyboard() {
  keyboard.innerHTML = "";
  for (let i = 0; i < 36; i += 1) {
    const pitch = i % 12;
    const key = document.createElement("button");
    key.type = "button";
    key.className = `key ${isAccidental(pitch) ? "accidental" : "natural"}`;
    key.dataset.pitch = String(pitch);
    key.dataset.position = String(i);
    key.setAttribute("aria-label", `以 ${splitLabel(pitch).join(" 或 ")} 为主音`);

    const label = document.createElement("span");
    label.className = "note-label";
    splitLabel(pitch).forEach((name) => {
      const line = document.createElement("span");
      line.textContent = name;
      label.appendChild(line);
    });
    key.appendChild(label);

    key.addEventListener("click", () => setTonicPosition(i, { center: false }));
    keyboard.appendChild(key);
  }
}

function renderOptions() {
  tonicOptions.forEach((option) => {
    const item = document.createElement("option");
    item.value = String(option.index);
    item.textContent = option.label;
    tonicSelect.appendChild(item);
  });
}

function renderRuler() {
  ruler.innerHTML = "";
  degreeOffsets.forEach((offset, index) => {
    const degree = document.createElement("div");
    degree.className = "degree";
    degree.style.left = `calc(var(--step) * ${offset + 0.5})`;

    const number = document.createElement("span");
    number.className = `degree-number ${index === 7 ? "octave" : ""}`;
    number.textContent = index === 7 ? "1" : String(index + 1);
    degree.appendChild(number);
    ruler.appendChild(degree);
  });

  let cursor = 0;
  naturalMajorSteps.forEach((span) => {
    const isHalf = span === 1;
    const bracket = document.createElement("div");
    bracket.className = `bracket ${isHalf ? "half" : ""}`;
    bracket.style.left = `calc(var(--step) * ${cursor + 0.5})`;
    bracket.style.width = `calc(var(--step) * ${span})`;
    ruler.appendChild(bracket);

    const label = document.createElement("div");
    label.className = `interval-label ${isHalf ? "half" : ""}`;
    label.style.left = `calc(var(--step) * ${cursor + span / 2 + 0.5})`;
    label.textContent = isHalf ? "半" : "全";
    ruler.appendChild(label);

    cursor += span;
  });
}

function normalizePitch(index) {
  return ((index % 12) + 12) % 12;
}

function scalePitches() {
  return degreeOffsets.slice(0, 7).map((offset) => normalizePitch(tonicIndex + offset));
}

function clampTonicPosition(position) {
  return Math.max(0, Math.min(23, position));
}

function setTonicPosition(nextPosition, options = {}) {
  tonicPosition = clampTonicPosition(nextPosition);
  tonicIndex = normalizePitch(tonicPosition);
  tonicSelect.value = String(tonicIndex);
  updateView();
  if (options.center) {
    centerTonic();
  }
}

function setTonic(nextTonic) {
  const preferredOctave = 12 + normalizePitch(nextTonic);
  setTonicPosition(preferredOctave, { center: true });
}

function updateView() {
  stepWidth = getStepWidth();
  const positions = new Set();
  degreeOffsets.slice(0, 7).forEach((offset) => positions.add(tonicPosition + offset));

  keyboard.querySelectorAll(".key").forEach((key) => {
    const position = Number(key.dataset.position);
    key.classList.toggle("in-scale", positions.has(position));
    key.classList.toggle("tonic", position === tonicPosition);
    key.querySelector(".degree-badge")?.remove();

    const degree = degreeOffsets.slice(0, 7).indexOf(position - tonicPosition);
    if (degree >= 0) {
      const badge = document.createElement("span");
      badge.className = "degree-badge";
      badge.textContent = String(degree + 1);
      key.appendChild(badge);
    }
  });

  ruler.style.left = `${tonicPosition * stepWidth}px`;
  ruler.setAttribute("aria-valuenow", String(tonicIndex));

  const names = activeNames();
  const tonicName = names[tonicIndex];
  scaleTitle.textContent = `${tonicName} 自然大调`;
  scaleList.innerHTML = "";
  scalePitches().forEach((pitch, index) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>${index + 1}</span>${names[pitch]}`;
    scaleList.appendChild(item);
  });
}

function centerTonic() {
  stepWidth = getStepWidth();
  const targetLeft = tonicPosition * stepWidth - scrollShell.clientWidth * 0.25;
  scrollShell.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  setTimeout(updateView, 180);
}

function dragTo(clientX) {
  const laneLeft = scrollShell.getBoundingClientRect().left;
  const rawLeft = dragStartLeft + clientX - dragStartX + scrollShell.scrollLeft;
  const localLeft = rawLeft - laneLeft;
  const snapped = Math.round(localLeft / stepWidth);
  setTonicPosition(snapped, { center: false });
}

tonicSelect.addEventListener("change", (event) => setTonic(Number(event.target.value)));

sharpMode.addEventListener("click", () => {
  namingMode = "sharp";
  sharpMode.classList.add("active");
  flatMode.classList.remove("active");
  updateView();
});

flatMode.addEventListener("click", () => {
  namingMode = "flat";
  flatMode.classList.add("active");
  sharpMode.classList.remove("active");
  updateView();
});

ruler.addEventListener("pointerdown", (event) => {
  isDragging = true;
  dragStartX = event.clientX;
  dragStartLeft = ruler.getBoundingClientRect().left;
  ruler.setPointerCapture(event.pointerId);
});

ruler.addEventListener("pointermove", (event) => {
  if (!isDragging) return;
  dragTo(event.clientX);
});

ruler.addEventListener("pointerup", () => {
  isDragging = false;
});

ruler.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    setTonic(tonicIndex - 1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    setTonic(tonicIndex + 1);
  }
});

scrollShell.addEventListener("scroll", () => window.requestAnimationFrame(updateView));
window.addEventListener("resize", updateView);

renderOptions();
renderKeyboard();
renderRuler();
setTonic(0);
