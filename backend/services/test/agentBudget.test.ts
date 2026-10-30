import { describe, expect, it } from "vitest";
import { createAgentBudget } from "../../utils/agentBudget.js";

describe("agent execution budget", () => {
  it("counts elapsed setup time and reserves final and persistence time", () => {
    let now = 100;
    const budget = createAgentBudget(() => now);
    expect(budget.remainingMs()).toBe(50_000);
    expect(budget.providerTimeoutMs(false)).toBe(38_000);
    now += 5_000;
    expect(budget.elapsedMs()).toBe(5_000);
    expect(budget.remainingMs()).toBe(45_000);
    expect(budget.canStartAction()).toBe(true);
    now += 33_000;
    expect(budget.canStartAction()).toBe(false);
    expect(budget.providerTimeoutMs(false)).toBe(0);
    expect(budget.providerTimeoutMs(true)).toBe(10_000);
    now += 12_000;
    expect(budget.remainingMs()).toBe(0);
    expect(budget.providerTimeoutMs(true)).toBe(0);
    now += 1_000;
    expect(budget.remainingMs()).toBe(0);
  });
  it("clamps provider calls to 45 seconds even with a larger total", () => {
    const budget = createAgentBudget(() => 0, 90_000);
    expect(budget.providerTimeoutMs(false)).toBe(45_000);
    expect(budget.providerTimeoutMs(true)).toBe(45_000);
  });
  it("requires strictly more than the action reserve and never returns a negative timeout", () => {
    const budget = createAgentBudget(() => 0, 12_000);
    expect(budget.canStartAction()).toBe(false);
    expect(budget.providerTimeoutMs(false)).toBe(0);
    expect(createAgentBudget(() => 0, 1_000).providerTimeoutMs(true)).toBe(0);
  });
  it("always returns integer values for timeouts even with high-resolution floating point timestamps", () => {
    let now = 123.456789;
    const budget = createAgentBudget(() => now);
    now += 54.321098;
    expect(Number.isInteger(budget.elapsedMs())).toBe(true);
    expect(Number.isInteger(budget.remainingMs())).toBe(true);
    expect(Number.isInteger(budget.providerTimeoutMs(false))).toBe(true);
    expect(Number.isInteger(budget.providerTimeoutMs(true))).toBe(true);
  });
});
