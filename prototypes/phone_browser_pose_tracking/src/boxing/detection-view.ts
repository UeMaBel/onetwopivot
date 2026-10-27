import type { BoxingPipelineUpdate, JabEvent, BoxingThresholds } from "@onetwopivot/boxing-detection";
import { evaluateSequences, type EvaluationInput, type EvaluationReport } from "@onetwopivot/boxing-detection";
import { formatPunchEventLabel } from "./punch-event-label";
import "./detection.css";

export function mountDetectionView(thresholds: BoxingThresholds) {
  const root = document.querySelector<HTMLDivElement>("#boxing-detection");
  if (!root) throw new Error("Boxing detection view root is missing.");
  root.innerHTML = `
    <section class="detection-card" aria-label="Live boxing detection">
      <div class="detection-heading"><div><p class="eyebrow">ON-DEVICE DETECTION</p><h2>Movement observations</h2><p>Face the camera square on; punches should travel toward it. Retracted means the arm bent again, not that guard was restored.</p></div></div>
      <div class="arm-readouts" id="arm-readouts"></div>
      <details class="tuning-panel"><summary>Adjust detector thresholds</summary><div class="tuning-fields">
        <label>Stance depth ratio <input id="stance-threshold" type="number" min="0.05" max="0.8" step="0.01"></label>
        <label>Minimum arm extension <input id="extension-threshold" type="number" min="0.5" max="0.99" step="0.01"></label>
        <label>Movement start speed / second <input id="movement-threshold" type="number" min="0.1" max="20" step="0.1"></label>
      <label>Forward movement <input id="forward-threshold" type="number" min="0.01" max="0.5" step="0.01"></label>
      </div></details>
      <h3>Punch events <span id="jab-count">0</span></h3><ol class="jab-events" id="jab-events"><li class="empty-events">Punch events appear here when the camera is running.</li></ol>
    </section>
    <details class="evaluation-card"><summary>Evaluate labeled pose sequences</summary>
      <p>Choose a local JSON file. Sequences are replayed in this browser and are not uploaded.</p>
      <label class="evaluation-file">Labeled sequence JSON <input id="evaluation-file" type="file" accept="application/json,.json"></label>
      <button id="evaluate-sequences" class="secondary-button" type="button" disabled>Run evaluation</button>
      <pre id="evaluation-report" aria-live="polite">Select a labeled dataset to compare detector results.</pre>
    </details>`;

  const arms = query<HTMLElement>(root, "#arm-readouts");
  const eventList = query<HTMLOListElement>(root, "#jab-events");
  const count = query<HTMLElement>(root, "#jab-count");
  const fileInput = query<HTMLInputElement>(root, "#evaluation-file");
  const evaluateButton = query<HTMLButtonElement>(root, "#evaluate-sequences");
  const report = query<HTMLElement>(root, "#evaluation-report");
  let selectedFile: File | undefined;
  let allEvents: JabEvent[] = [];

  for (const [selector, key] of [["#stance-threshold", "stanceDepthRatio"], ["#extension-threshold", "minimumExtension"], ["#movement-threshold", "movementStartSpeed"], ["#forward-threshold", "minimumForwardMovement"]] as const) {
    const input = query<HTMLInputElement>(root, selector);
    input.value = String(thresholds[key]);
    input.addEventListener("change", () => {
      const value = Number(input.value);
      if (Number.isFinite(value) && value > 0 && input.checkValidity()) thresholds[key] = value;
      else input.value = String(thresholds[key]);
    });
  }

  fileInput.addEventListener("change", () => {
    selectedFile = fileInput.files?.[0];
    evaluateButton.disabled = !selectedFile;
    report.textContent = selectedFile ? `${selectedFile.name} ready to evaluate locally.` : "Select a labeled dataset to compare detector results.";
  });
  evaluateButton.addEventListener("click", () => void evaluateSelected());

  function update(frame: BoxingPipelineUpdate) {
    arms.innerHTML = "";
    for (const side of ["left", "right"] as const) {
      const evidence = frame.arms[side];
      const card = document.createElement("div");
      card.className = "arm-readout";
      card.innerHTML = `<strong>${side} arm</strong><span>Extension ${evidence.extension === null ? "—" : `${Math.round(evidence.extension * 100)}%`}</span><span>Movement ${evidence.movement.toFixed(3)} normalized units/second</span>`;
      arms.append(card);
    }
    for (const recovered of frame.recoveryUpdates) {
      allEvents = allEvents.map((event) => event.id === recovered.eventId ? { ...event, recovery: recovered.recovery, recoveryTimestamp: recovered.timestamp } : event);
    }
    if (frame.events.length) allEvents.push(...frame.events);
    count.textContent = String(allEvents.length);
    eventList.innerHTML = "";
    for (const event of [...allEvents].reverse().slice(0, 20)) eventList.append(renderEvent(event));
    if (!allEvents.length) eventList.innerHTML = '<li class="empty-events">No punch events detected yet.</li>';
  }

  function reset() {
    allEvents = [];
    arms.innerHTML = "";
    count.textContent = "0";
    eventList.innerHTML = '<li class="empty-events">No punch events detected yet.</li>';
  }

  async function evaluateSelected() {
    if (!selectedFile) return;
    evaluateButton.disabled = true;
    report.textContent = "Replaying labeled pose sequences…";
    try {
      const input = JSON.parse(await selectedFile.text()) as EvaluationInput;
      const result: EvaluationReport = evaluateSequences(input, thresholds);
      report.textContent = JSON.stringify(result, null, 2);
    } catch (error) {
      report.textContent = `Could not evaluate dataset: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      evaluateButton.disabled = false;
    }
  }

  return { update, reset };
}

function renderEvent(event: JabEvent) {
  const item = document.createElement("li");
  item.className = "jab-event";
    item.innerHTML = `<strong>${formatPunchEventLabel(event)}</strong><span>${event.stance.stance} (${event.stance.source}) · confidence ${Math.round(event.confidence * 100)}%</span><span>Extension ${Math.round(event.evidence.extension * 100)}% · forward ${event.evidence.forwardMovement.toFixed(2)} · arm status ${event.recovery}</span>`;
  return item;
}

function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Required detection view element missing: ${selector}`);
  return element;
}
