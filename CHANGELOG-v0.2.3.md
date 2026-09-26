# RetrievalOps v0.2.3 Changelog

## Overview

RetrievalOps v0.2.3 introduces the intent-aware, decision-driven retrieval architecture for agentic applications. The framework now supports deterministic intent compilation, strategy routing, optional Jev-based decision delegation, and a swarm-force coordinator without allowing any agent or model layer to bypass policy enforcement.

## Highlights

### Intent-aware retrieval
- Added the `IntentCompiler` contract and intent compilation request model.
- Added normalized intent profiles with task type, evidence requirements, risk flags, and retrieval budget hints.
- Included a default `SimpleIntentCompiler` for risk assessment, policy checking, change analysis, root-cause analysis, and fact lookup.

### Decision-driven routing
- Added the `DecisionProvider` contract and default scoring/evaluation primitives.
- The retrieval pipeline now uses decision metadata to choose and validate the search route.
- Added `DefaultDecisionProvider` and `JevDecisionProvider` support for optional model-backed routing.

### Agent swarm force layer
- Added a deterministic multi-agent coordinator: `AgentSwarmForce`.
- It selects specialist agents based on the inferred task and enforces a capped evidence budget.
- Swarm outputs include consensus scoring and route guidance while remaining policy-safe.

### Policy-first safety model
- Policy enforcement remains a hard gate before search execution.
- The intent and decision layers augment routing and evidence selection but do not replace authorization or access control.

### Core improvements
- Retrieval plans now include intent, decision confidence, evidence sufficiency, and risk flags.
- Search execution is more explainable and better suited for operational agent workflows.
- Regression coverage was expanded for the pipeline and agent swarm behavior.

## Updated public APIs

- `IntentCompiler`
- `IntentCompilationRequest`
- `IntentProfile`
- `DecisionProvider`
- `DecisionContext`
- `DecisionOption`
- `ChoiceResult`
- `ScoreResult`
- `AgentSwarmForce`

## Compatibility

This release is backward-compatible for existing RetrievalOps integrations. Existing retrieval flows continue to work, while the new intent and decision layers are optional and additive.

## Validation

The core framework and the new swarm coordinator were validated with the project test suite:
- `packages/core/tests/pipeline.spec.ts` — 13 tests passed
- `packages/core/tests/swarm.spec.ts` — 2 tests passed

## Release summary

v0.2.3 formalizes the framework as a security-aware, decision-aware retrieval platform for agent implementations and prepares the codebase for production-oriented orchestration patterns.
