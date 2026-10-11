import type { BoxingPipelineUpdate, JabEvent, BoxingThresholds } from "@onetwopivot/boxing-detection";
import { evaluateSequences, type EvaluationInput, type EvaluationReport } from "@onetwopivot/boxing-detection";
import "./detection.css";

export function mountDetectionView(thresholds: BoxingThresholds) {
  const root = document.querySelector<HTMLDivElement>("#boxing-detection");
  if (!root) throw new Error("Boxing detection view root is missing.");
  root.innerHTML = `
    <section class="detection-card" aria-label="Live boxing detection">
      <div class="detection-heading"><div><p class="eyebrow">ON-DEVICE DETECTION</p><h2>Movement observations</h2></div><span id="stance-source" class="stance-badge">Waiting</span></div>
      <p class="stance-readout" id="stance-readout">Stance: orthodox (assumed)</p>
      <div class="arm-readouts" id="arm-readouts"></div>
      <details class="tuning-panel"><summary>Adjust detector thresholds</summary><div class="tuning-fields">
        <label>Stance depth ratio <input id="stance-threshold" type="number" min="0.05" max="0.8" step="0.01"></label>
        <label>Minimum arm extension <input id="extension-threshold" type="number" min="0.5" max="0.99" step="0.01"></label>
        <label>Movement start change <input id="movement-threshold" type="number" min="0.01" max="0.5" step="0.01"></label>
        <label>Forward movement <input id="forward-threshold" type="number" min="0.01" max="0.5" step="0.01"></label>
      </div></details>
      <h3>Jab events <span id="jab-count">0</span></h3><ol class="jab-events" id="jab-events"><li class="empty-events">Jab events appear here when the camera is running.</li></ol>
      <p class="unclassified-readout" id="unclassified-readout" aria-live="polite"></p>
    </section>
    <details class="evaluation-card"><summary>Evaluate labeled pose sequences</summary>
      <p>Choose a local JSON file. Sequences are replayed in this browser and are not uploaded.</p>
      <label class="evaluation-file">Labeled sequence JSON <input id="evaluation-file" type="file" accept="application/json,.json"></label>
      <button id="evaluate-sequences" class="secondary-button" type="button" disabled>Run evaluation</button>
      <pre id="evaluation-report" aria-live="polite">Select a labeled dataset to compare detector results.</pre>
    </details>`;

  const stanceReadout = query<HTMLElement>(root, "#stance-readout");
  const stanceSource = query<HTMLElement>(root, "#stance-source");
  const arms = query<HTMLElement>(root, "#arm-readouts");
  const eventList = query<HTMLOListElement>(root, "#jab-events");
  const count = query<HTMLElement>(root, "#jab-count");
  const unclassified = query<HTMLElement>(root, "#unclassified-readout");
  const fileInput = query<HTMLInputElement>(root, "#evaluation-file");
  const evaluateButton = query<HTMLButtonElement>(root, "#evaluate-sequences");
  const report = query<HTMLElement>(root, "#evaluation-report");
  let selectedFile: File | undefined;
  let allEvents: JabEvent[] = [];
  let uncertainCount = 0;

  for (const [selector, key] of [["#stance-threshold", "stanceDepthRatio"], ["#extension-threshold", "minimumExtension"], ["#movement-threshold", "movementStartDelta"], ["#forward-threshold", "minimumForwardMovement"]] as const) {
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
    stanceReadout.textContent = `Stance: ${frame.stance.context.stance} (${frame.stance.context.source})`;
    stanceSource.textContent = frame.stance.current ? "Detected" : frame.stance.context.source === "assumed" ? "Assumed" : "Retained";
    arms.innerHTML = "";
    for (const side of ["left", "right"] as const) {
      const evidence = frame.arms[side];
      const card = document.createElement("div");
      card.className = "arm-readout";
      card.innerHTML = `<strong>${side} arm</strong><span>Extension ${evidence.extension === null ? "—" : `${Math.round(evidence.extension * 100)}%`}</span><span>Movement ${evidence.movement.toFixed(3)} normalized/frame</span>`;
      arms.append(card);
    }
    for (const recovered of frame.recoveryUpdates) {
      allEvents = allEvents.map((event) => event.id === recovered.eventId ? { ...event, recovery: recovered.recovery, recoveryTimestamp: recovered.timestamp } : event);
    }
    if (frame.events.length) allEvents.push(...frame.events);
    if (frame.unclassified.length) uncertainCount += frame.unclassified.length;
    count.textContent = String(allEvents.length);
    eventList.innerHTML = "";
    for (const event of [...allEvents].reverse().slice(0, 20)) eventList.append(renderEvent(event));
    if (!allEvents.length) eventList.innerHTML = '<li class="empty-events">No jab events detected yet.</li>';
    unclassified.textContent = uncertainCount ? `${uncertainCount} extension movement${uncertainCount === 1 ? "" : "s"} remain unclassified (including rear-hand extensions).` : "";
  }

  function reset() {
    allEvents = [];
    uncertainCount = 0;
    stanceReadout.textContent = "Stance: orthodox (assumed)";
    stanceSource.textContent = "Assumed";
    arms.innerHTML = "";
    count.textContent = "0";
    unclassified.textContent = "";
    eventList.innerHTML = '<li class="empty-events">No jab events detected yet.</li>';
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
  item.innerHTML = `<strong>Jab · ${event.arm} arm</strong><span>${event.stance.stance} (${event.stance.source}) · confidence ${Math.round(event.confidence * 100)}%</span><span>Extension ${Math.round(event.evidence.extension * 100)}% · forward ${event.evidence.forwardMovement.toFixed(2)} · recovery ${event.recovery}</span>`;
  return item;
}

function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Required detection view element missing: ${selector}`);
  return element;
}
