// frontend/src/__tests__/live/randomizerClientLifecycleLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  computeEligiblePool,
  computePlayablePool,
  filterPerksByMutator,
  pickRandomLoadout,
  buildDrawnSlots,
  isExhaustionPerk,
  isHexOrBoonPerk,
} from "@/components/generator/lib/perkPicker";
import {
  getDrawnPerksForRole,
  saveDrawnPerksForRole,
  clearDrawnPerksForRole,
  getActiveMutatorForRole,
  saveActiveMutatorForRole,
  safeGetJSON,
  safeSetJSON,
} from "@/components/generator/lib/generatorStorage";
import { Perk } from "@/types/perks";
import { ChaosMutator } from "@/types/chaos";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Client-Decoupled Perk Randomizer Lifecycle", async (t) => {
  // 1. Fetch real perks from live backend
  const perksRes = await fetch(`${API_BASE}/api/v1/perks?limit=500`);
  assert.strictEqual(perksRes.status, 200, "Backend /api/v1/perks must be online");
  const perksJson = await perksRes.json();
  const allPerks: Perk[] = perksJson.data || perksJson.perks || [];
  assert.ok(allPerks.length >= 100, `Expected at least 100 perks, got ${allPerks.length}`);

  const survivorPerks = computeEligiblePool(allPerks, "Survivor", false);
  const killerPerks = computeEligiblePool(allPerks, "Killer", false);
  assert.ok(survivorPerks.length >= 50, "Survivor pool must contain perks");
  assert.ok(killerPerks.length >= 50, "Killer pool must contain perks");

  await t.test("Verify legacy generator API endpoints are strictly 404 on live server", async () => {
    const endpoints = [
      { url: `${API_BASE}/api/v1/generator/config`, method: "GET" },
      { url: `${API_BASE}/api/v1/generator/config`, method: "POST", body: { gen_mode: "wheel" } },
      { url: `${API_BASE}/api/v1/generator/drawn?role=Survivor`, method: "GET" },
      { url: `${API_BASE}/api/v1/generator/draw`, method: "POST", body: { role: "Survivor", perks: ["Sprint Burst"] } },
      { url: `${API_BASE}/api/v1/generator/reset`, method: "POST", body: { role: "Survivor" } },
    ];

    for (const ep of endpoints) {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: { "Content-Type": "application/json" },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      assert.strictEqual(
        res.status,
        404,
        `Expected endpoint ${ep.method} ${ep.url} to return 404, but got ${res.status}`
      );
    }
  });

  await t.test("Client randomizer multi-draw simulation with No-Repeat Mode", () => {
    let drawnList: string[] = [];

    // Initial pool
    let playable = computePlayablePool(survivorPerks, true, drawnList);
    assert.strictEqual(playable.length, survivorPerks.length);

    // Draw 1: pick 4 perks
    const draw1 = pickRandomLoadout(playable, null, 4);
    assert.strictEqual(draw1.length, 4);
    drawnList = [...drawnList, ...draw1.map((p) => p.name)];

    // Playable pool reduced by exactly 4
    playable = computePlayablePool(survivorPerks, true, drawnList);
    assert.strictEqual(playable.length, survivorPerks.length - 4);
    for (const drawnPerk of draw1) {
      assert.ok(!playable.some((p) => p.name === drawnPerk.name), "Drawn perk must not appear in remaining pool");
    }

    // Draw 2: pick another 4 perks
    const draw2 = pickRandomLoadout(playable, null, 4);
    assert.strictEqual(draw2.length, 4);
    drawnList = [...drawnList, ...draw2.map((p) => p.name)];

    // Verify Draw 1 and Draw 2 have completely disjoint perks
    const draw1Names = new Set(draw1.map((p) => p.name));
    for (const perk of draw2) {
      assert.ok(!draw1Names.has(perk.name), "Draw 2 must have no repetition from Draw 1");
    }

    // Toggle No-Repeat OFF -> full pool restored immediately
    const fullPoolWhenOff = computePlayablePool(survivorPerks, false, drawnList);
    assert.strictEqual(fullPoolWhenOff.length, survivorPerks.length, "Pool must restore 100% when no-repeat is off");

    // Toggle No-Repeat back ON -> drawn exclusions restored
    const excludedWhenOn = computePlayablePool(survivorPerks, true, drawnList);
    assert.strictEqual(excludedWhenOn.length, survivorPerks.length - 8);
  });

  await t.test("Chaos Mutators filter real live DBD perk catalog accurately", () => {
    // 1. No Exhaustion Mutator
    const noExhaustionMutator: ChaosMutator = {
      id: "no_exhaustion",
      name: "No Exhaustion Perks",
      description: "Exhaustion is forbidden",
      type: "curse",
      icon: "🚫",
      badgeBg: "bg-red-500",
      borderColor: "border-red-500",
      textColor: "text-red-500",
    };

    const withoutExhaustion = filterPerksByMutator(survivorPerks, noExhaustionMutator);
    assert.ok(withoutExhaustion.length > 0);
    assert.ok(withoutExhaustion.length < survivorPerks.length, "Must filter out real exhaustion perks");
    for (const perk of withoutExhaustion) {
      assert.ok(!isExhaustionPerk(perk), `Perk '${perk.name}' should not be in no-exhaustion pool`);
    }

    // 2. Hex and Boon Only Mutator
    const hexBoonMutator: ChaosMutator = {
      id: "hex_boon_only",
      name: "Hex & Boon Ritual",
      description: "Totem perks only",
      type: "buff",
      icon: "🔮",
      badgeBg: "bg-purple-500",
      borderColor: "border-purple-500",
      textColor: "text-purple-500",
    };

    const killerHexes = filterPerksByMutator(killerPerks, hexBoonMutator);
    assert.ok(killerHexes.length > 0, "Must find real DBD Hex perks");
    for (const perk of killerHexes) {
      assert.ok(isHexOrBoonPerk(perk), `Perk '${perk.name}' must be a hex or boon perk`);
    }
  });

  await t.test("buildDrawnSlots correctly calculates pagination pages on live dataset", () => {
    const sorted = [...killerPerks].sort((a, b) => a.name.localeCompare(b.name));
    const samplePicks = [sorted[0], sorted[14], sorted[15], sorted[29]];
    const slots = buildDrawnSlots(samplePicks, sorted, 15);

    assert.strictEqual(slots.length, 4);
    assert.strictEqual(slots[0].page, 1);
    assert.strictEqual(slots[0].slot, 1);
    assert.strictEqual(slots[1].page, 1);
    assert.strictEqual(slots[1].slot, 15);
    assert.strictEqual(slots[2].page, 2);
    assert.strictEqual(slots[2].slot, 1);
    assert.strictEqual(slots[3].page, 2);
    assert.strictEqual(slots[3].slot, 15);
  });
});
