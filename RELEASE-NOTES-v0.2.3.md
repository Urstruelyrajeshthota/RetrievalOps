# RetrievalOps v0.2.3

## Intent-aware retrieval for agentic systems

This release advances RetrievalOps from a simple retrieval orchestrator into an intent-aware, decision-aware framework for agent implementations. The platform now supports intent compilation, route selection, and swarm-style coordination while preserving hard policy enforcement as the security boundary.

## Release highlights
- Added intent compilation and decision-aware routing
- Added swarm-force coordination for multi-agent retrieval
- Preserved policy-first enforcement in all execution paths
- Expanded framework explainability with plan metadata and risk flags

## What’s new

### Intent compilation
- Added structured task interpretation and evidence requirements.
- Normalizes queries into task types such as root cause, policy check, risk assessment, change analysis, and fact lookup.
- Produces retrieval strategy hints and evidence budgets that inform execution.

### Decision layer
- Added `DecisionProvider` and decision metadata for route selection and sufficiency scoring.
- Supports both default, deterministic routing and optional Jev-backed decision delegation.
- Allows planners and agent workflows to be more explainable and goal-aware.

### Swarm-force orchestration
- Added an `AgentSwarmForce` coordinator for multi-agent task execution.
- Selects specialist agents based on intent and preserves a bounded evidence budget.
- Produces a consensus score and summary for downstream decision-making.

### Policy-first safety
- Authorization remains enforced by the policy engine before search execution.
- Agents can contribute evidence and route choices, but they cannot override access control.

## Included improvements

- `SimpleIntentCompiler` default implementation
- `DefaultDecisionProvider` default implementation
- `JevDecisionProvider` optional delegation wrapper
- search plan metadata for intent, risk flags, and decision confidence
- stronger validation around route selection and intent precedence

## Why this matters

The updated framework is suitable for agentic retrieval patterns where the system must:
- infer the task intent
- choose the best evidence path
- coordinate specialist agents
- remain deterministic and policy-safe

## Upgrade notes

This release is backward-compatible with existing RetrievalOps integrations. The new intent and decision layers are optional, and existing flows continue to work without requiring code changes.

## Validation

Validated with the core pipeline and swarm regression tests:
- `packages/core/tests/pipeline.spec.ts`: 13 tests passed
- `packages/core/tests/swarm.spec.ts`: 2 tests passed

## Recommended publishing summary

> RetrievalOps v0.2.3 introduces intent-aware retrieval and decision-driven agent orchestration with policy-first safety. It adds deterministic task compilation, route scoring, optional Jev decision integration, and a swarm-force coordinator for advanced agent workflows.
