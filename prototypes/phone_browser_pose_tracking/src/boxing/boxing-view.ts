import { boxingProtocol } from "./boxing-config";
import "./boxing.css";

export type BoxingCheckView = {
  start: HTMLButtonElement;
  advance: HTMLButtonElement;
  step: HTMLDivElement;
  note: HTMLParagraphElement;
};

export function mountBoxingCheck(): BoxingCheckView {
  const root = get<HTMLDivElement>("#boxing-check");
  root.innerHTML = `
    <section class="boxing-check-card" aria-label="Boxing movement check">
      <div class="boxing-section-heading"><div><p class="eyebrow">REPEATABLE CHECK</p><h2>Run the movement check</h2></div><span class="boxing-test-duration">~30 sec</span></div>
      <div class="boxing-test-step" id="boxing-test-step"><span class="boxing-step-number">01</span><div><strong>Hold your boxing guard</strong><p>Keep your whole body in view for ${boxingProtocol.guardHoldSeconds} seconds.</p></div></div>
      <div class="boxing-test-actions"><button class="secondary-button" id="boxing-start-test" disabled>Start check</button><button class="secondary-button" id="boxing-advance-test" hidden></button></div>
      <p class="boxing-test-note" id="boxing-test-note">Start the camera before beginning the check.</p>
    </section>`;

  return {
    start: get<HTMLButtonElement>("#boxing-start-test"),
    advance: get<HTMLButtonElement>("#boxing-advance-test"),
    step: get<HTMLDivElement>("#boxing-test-step"),
    note: get<HTMLParagraphElement>("#boxing-test-note"),
  };
}

function get<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element)
    throw new Error(`Required boxing check element not found: ${selector}`);
  return element;
}
