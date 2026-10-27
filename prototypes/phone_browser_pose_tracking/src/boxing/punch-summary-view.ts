import type { BoxingPipelineUpdate } from "@onetwopivot/boxing-detection";
import "./punch-summary.css";

const punchNumbers = ["1", "2", "3", "4", "5", "6"] as const;
type PunchNumber = (typeof punchNumbers)[number];

export function mountPunchSummaryView() {
  const root = document.querySelector<HTMLDivElement>("#punch-summary");
  if (!root) throw new Error("Punch summary view root is missing.");

  root.innerHTML = `
    <section class="punch-summary-card" aria-label="Punch counts">
      <p class="punch-summary-stance" id="current-stance">Stance: orthodox (assumed)</p>
      <h2>Punches</h2>
      <div class="punch-table-wrap">
        <table class="punch-count-table">
          <thead><tr><th scope="col"></th>${punchNumbers.map((number) => `<th scope="col">${number}</th>`).join("")}<th scope="col">Unclassified</th></tr></thead>
          <tbody><tr><th scope="row">Counter</th>${punchNumbers.map((number) => `<td id="punch-count-${number}">0</td>`).join("")}<td id="unclassified-count">0</td></tr></tbody>
        </table>
      </div>
    </section>`;

  const stance = query<HTMLElement>(root, "#current-stance");
  const punchCounts = Object.fromEntries(
    punchNumbers.map((number) => [number, query<HTMLElement>(root, `#punch-count-${number}`)]),
  ) as Record<PunchNumber, HTMLElement>;
  const unclassifiedCount = query<HTMLElement>(root, "#unclassified-count");
  const counts: Record<PunchNumber, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 };
  let unclassified = 0;

  function renderCounts() {
    for (const number of punchNumbers) punchCounts[number].textContent = String(counts[number]);
    unclassifiedCount.textContent = String(unclassified);
  }

  function update(frame: BoxingPipelineUpdate) {
    stance.textContent = `Stance: ${frame.stance.context.stance} (${frame.stance.context.source})`;
    for (const event of frame.events) counts[String(event.label[0]) as PunchNumber]++;
    unclassified += frame.unclassified.length;
    renderCounts();
  }

  function reset() {
    for (const number of punchNumbers) counts[number] = 0;
    unclassified = 0;
    stance.textContent = "Stance: orthodox (assumed)";
    renderCounts();
  }

  return { update, reset };
}

function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Required punch summary element missing: ${selector}`);
  return element;
}
