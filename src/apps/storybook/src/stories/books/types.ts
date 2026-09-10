import React from 'react';

export interface SimulatedAction {
  /** Short punchy label for the simulation badge, e.g. "Customer Selects Saree" */
  label: string;
  /** Detailed description of what happens behind the scenes during this step */
  description: string;
  /** Suggested pause duration in milliseconds when auto-playing (defaults to 3500ms) */
  durationMs?: number;
}

export interface JourneyStepRenderProps<TState = any> {
  state: TState;
  updateState: (updater: Partial<TState> | ((prev: TState) => Partial<TState>)) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
}

export interface JourneyStep<TState = any> {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  simulatedAction: SimulatedAction;
  render: (props: JourneyStepRenderProps<TState>) => React.ReactNode;
}

export interface JourneyDefinition<TState = any> {
  id: string;
  title: string;
  description: string;
  tag?: string;
  initialState: TState;
  steps: JourneyStep<TState>[];
}
