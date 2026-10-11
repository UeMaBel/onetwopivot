import type { BoxingThresholds, CountBenchmarkClip, CountBenchmarkReport, PunchEvent, PoseSequence, SequenceAnnotation, UnclassifiedMovement } from "./contracts";
import type { BoxingActionLabel, BenchmarkSplit } from "./contracts";
import { BoxingDetectionPipeline } from "./pipeline";
import { defaultBoxingThresholds } from "./thresholds";

export type EvaluationInput = { sequences: PoseSequence[]; annotations: SequenceAnnotation[] };
type MovementPrediction = { timestamp: number; arm: string; label: BoxingActionLabel | "unclassified" };

export type EvaluationReport = {
  sequenceCount: number;
  expectedJabs: number;
  detectedJabs: number;
  matchedJabs: number;
  missedJabs: Array<{ sequenceId: string; timestamp: number; arm: string }>;
  extraJabs: Array<{ sequenceId: string; timestamp: number; arm: string }>;
  precision: number;
  recall: number;
  f1: number;
  movementCount: number;
  classifiedMovements: number;
  correctlyClassifiedMovements: number;
  classificationCoverage: number;
  classificationAccuracy: number;
  stance: { expected: number; correct: number; accuracy: number };
  expectedActions: number;
  detectedActions: number;
  matchedActions: number;
  missedActions: Array<{ sequenceId: string; timestamp: number; arm: string; label: BoxingActionLabel }>;
  extraActions: Array<{ sequenceId: string; timestamp: number; arm: string; label: BoxingActionLabel }>;
};

export function evaluateSequences(
  input: EvaluationInput,
  thresholds: BoxingThresholds = defaultBoxingThresholds,
  timingToleranceMs = 250,
): EvaluationReport {
  const annotations = new Map(input.annotations.map((annotation) => [annotation.sequenceId, annotation]));
  const missedJabs: EvaluationReport["missedJabs"] = [];
  const extraJabs: EvaluationReport["extraJabs"] = [];
  const missedActions: EvaluationReport["missedActions"] = [];
  const extraActions: EvaluationReport["extraActions"] = [];
  let expectedJabs = 0;
  let detectedJabs = 0;
  let matchedJabs = 0;
  let expectedActions = 0;
  let detectedActions = 0;
  let matchedActions = 0;
  let movementCount = 0;
  let classifiedMovements = 0;
  let correctlyClassifiedMovements = 0;
  let stanceExpected = 0;
  let stanceCorrect = 0;

  for (const sequence of input.sequences) {
    const annotation = annotations.get(sequence.id);
    if (!annotation) throw new Error(`Missing annotation for sequence: ${sequence.id}`);
    const pipeline = new BoxingDetectionPipeline(thresholds);
    const events: PunchEvent[] = [];
    const uncertain: UnclassifiedMovement[] = [];
    const updates = sequence.frames.map((frame) => {
      const update = pipeline.process(frame);
      events.push(...update.events);
      uncertain.push(...update.unclassified);
      return update;
    });

    const legacyJabs = annotation.jabs ?? [];
    const expectedJabLabels = [...legacyJabs].sort((a, b) => a.timestamp - b.timestamp);
    const expectedActionLabels = (annotation.actions ?? expectedJabLabels.map((jab) => ({ ...jab, label: "1" as const }))).sort((a, b) => a.timestamp - b.timestamp);
    const expectedMovements = annotation.movements ?? expectedActionLabels.map((action) => ({ timestamp: action.timestamp, arm: action.arm, expected: action.label }));
    const predictions: MovementPrediction[] = [
      ...events.map((event) => ({ timestamp: event.timestamp, arm: event.arm, label: event.label })),
      ...uncertain.map((movement) => ({ timestamp: movement.timestamp, arm: movement.arm, label: "unclassified" as const })),
    ];

    movementCount += expectedMovements.length;
    const usedMovements = new Set<number>();
    for (const expected of [...expectedMovements].sort((a, b) => a.timestamp - b.timestamp)) {
      const predictionIndex = nearestPrediction(predictions, usedMovements, expected, timingToleranceMs);
      if (predictionIndex < 0) continue;
      usedMovements.add(predictionIndex);
      if (predictions[predictionIndex].label !== "unclassified") {
        classifiedMovements++;
        if (predictions[predictionIndex].label === (expected.expected === "jab" ? "1" : expected.expected)) correctlyClassifiedMovements++;
      }
    }

    expectedActions += expectedActionLabels.length;
    detectedActions += events.length;
    const usedActions = new Set<number>();
    for (const action of expectedActionLabels) {
      const eventIndex = nearestPrediction(events, usedActions, action, timingToleranceMs);
      if (eventIndex < 0) missedActions.push({ sequenceId: sequence.id, ...action });
      else {
        usedActions.add(eventIndex);
        matchedActions++;
        if (isJabLabel(events[eventIndex].label)) matchedJabs++;
      }
    }
    events.forEach((event, index) => {
      if (!usedActions.has(index)) extraActions.push({ sequenceId: sequence.id, timestamp: event.timestamp, arm: event.arm, label: event.label });
    });
    expectedJabs += expectedActionLabels.filter((action) => isJabLabel(action.label)).length;
    detectedJabs += events.filter((event) => isJabLabel(event.label)).length;
    missedJabs.push(...missedActions.filter((action) => action.sequenceId === sequence.id && isJabLabel(action.label)).map(({ sequenceId, timestamp, arm }) => ({ sequenceId, timestamp, arm })));

    const stanceSamples = annotation.stances ?? (annotation.stance ? [{ timestamp: sequence.frames[0]?.timestamp ?? 0, stance: annotation.stance }] : []);
    for (const expected of stanceSamples) {
      const closest = updates.reduce<(typeof updates)[number] | undefined>((best, update) => {
        if (!best || Math.abs(update.timestamp - expected.timestamp) < Math.abs(best.timestamp - expected.timestamp)) return update;
        return best;
      }, undefined);
      stanceExpected++;
      if (closest?.stance.context.source === "detected" && closest.stance.context.stance === expected.stance) stanceCorrect++;
    }
  }

  const precision = detectedJabs === 0 ? (expectedJabs === 0 ? 1 : 0) : matchedJabs / detectedJabs;
  const recall = expectedJabs === 0 ? 1 : matchedJabs / expectedJabs;
  return {
    sequenceCount: input.sequences.length, expectedJabs, detectedJabs, matchedJabs,
    missedJabs, extraJabs: extraActions.filter((action) => isJabLabel(action.label)).map(({ sequenceId, timestamp, arm }) => ({ sequenceId, timestamp, arm })), precision, recall,
    f1: precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall),
    movementCount, classifiedMovements,
    correctlyClassifiedMovements,
    classificationCoverage: movementCount ? classifiedMovements / movementCount : 1,
    classificationAccuracy: classifiedMovements ? correctlyClassifiedMovements / classifiedMovements : 1,
    stance: { expected: stanceExpected, correct: stanceCorrect, accuracy: stanceExpected ? stanceCorrect / stanceExpected : 1 },
    expectedActions, detectedActions, matchedActions, missedActions, extraActions,
  };
}

export function evaluateCountBenchmark(
  clips: CountBenchmarkClip[],
  thresholds: BoxingThresholds = defaultBoxingThresholds,
  split: BenchmarkSplit | "all" = "all",
): CountBenchmarkReport {
  const selected = clips.filter((clip) => split === "all" || clip.annotation.split === split);
  const reports: CountBenchmarkReport["clips"] = [];
  const expectedTotals: Partial<Record<BoxingActionLabel, number>> = {};
  const detectedTotals: Partial<Record<BoxingActionLabel, number>> = {};
  let expectedStances = 0;
  let detectedStances = 0;
  let correctStances = 0;
  let totalUnclassified = 0;

  for (const clip of selected) {
    const pipeline = new BoxingDetectionPipeline(thresholds);
    const detectedActions: Partial<Record<BoxingActionLabel, number>> = {};
    let unclassifiedDetections = 0;
    let detectedStance: CountBenchmarkReport["clips"][number]["stance"]["detected"] = null;

    for (const frame of clip.frames) {
      const update = pipeline.process(frame);
      detectedStance ??= update.stance.current;
      unclassifiedDetections += update.unclassified.length;
      for (const event of update.events) {
        detectedActions[event.label] = (detectedActions[event.label] ?? 0) + 1;
      }
    }

    const correctStance = detectedStance === clip.annotation.stance;
    expectedStances++;
    if (detectedStance !== null) detectedStances++;
    if (correctStance) correctStances++;
    totalUnclassified += unclassifiedDetections;

    const actionLabels = new Set<BoxingActionLabel>([
      ...Object.keys(clip.annotation.actions) as BoxingActionLabel[],
      ...Object.keys(detectedActions) as BoxingActionLabel[],
    ]);
    for (const label of actionLabels) {
      expectedTotals[label] = (expectedTotals[label] ?? 0) + (clip.annotation.actions[label] ?? 0);
      detectedTotals[label] = (detectedTotals[label] ?? 0) + (detectedActions[label] ?? 0);
    }

    reports.push({
      id: clip.id,
      split: clip.annotation.split,
      stance: { expected: clip.annotation.stance, detected: detectedStance, correct: correctStance },
      expectedActions: clip.annotation.actions,
      detectedActions,
      unclassifiedDetections,
    });
  }

  const actionLabels = new Set<BoxingActionLabel>([...Object.keys(expectedTotals) as BoxingActionLabel[], ...Object.keys(detectedTotals) as BoxingActionLabel[]]);
  const actions: CountBenchmarkReport["actions"] = {};
  for (const label of actionLabels) {
    const expected = expectedTotals[label] ?? 0;
    const detected = detectedTotals[label] ?? 0;
    actions[label] = { expected, detected, difference: detected - expected };
  }

  return {
    version: 1,
    split,
    clips: reports,
    actions,
    unclassifiedDetections: totalUnclassified,
    stance: {
      expected: expectedStances,
      detected: detectedStances,
      correct: correctStances,
      accuracy: expectedStances === 0 ? 1 : correctStances / expectedStances,
    },
  };
}

function nearestPrediction<T extends { timestamp: number; arm: string }>(
  predictions: T[],
  used: Set<number>,
  expected: { timestamp: number; arm: string },
  toleranceMs: number,
) {
  return predictions.reduce((bestIndex, prediction, index) => {
    const distance = Math.abs(prediction.timestamp - expected.timestamp);
    if (used.has(index) || prediction.arm !== expected.arm || distance > toleranceMs) return bestIndex;
    if (bestIndex < 0 || distance < Math.abs(predictions[bestIndex].timestamp - expected.timestamp)) return index;
    return bestIndex;
  }, -1);
}

function isJabLabel(label: BoxingActionLabel) {
  return label === "1" || label === "1b";
}
