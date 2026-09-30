// frontend/src/__tests__/live/minigamesWorkflowLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://localhost").replace(/\/+$/, "");

// Node 18+ fetch supports ignoring self-signed SSL via custom dispatcher or setting NODE_TLS_REJECT_UNAUTHORIZED
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

test("Live Frontend Workflow: Minigames & DBD Idle End-to-End Suite", async () => {
  // 1. Catalog API
  const catRes = await fetch(`${API_BASE}/api/v1/minigames/catalog`);
  assert.strictEqual(catRes.status, 200, "Catalog endpoint must return 200");
  const catalog = await catRes.json();
  assert.ok(Array.isArray(catalog.characters), "Catalog must have characters array");
  assert.ok(catalog.characters.length > 50, "Catalog should have 50+ characters");
  assert.ok(Array.isArray(catalog.perks), "Catalog must have perks array");
  assert.ok(catalog.perks.length > 200, "Catalog should have 200+ perks");
  assert.ok(Array.isArray(catalog.realms), "Catalog must have realms array");
  assert.ok(catalog.realms.length > 10, "Catalog should have 10+ realms");

  // Verify character attributes present for classic guesser
  const sampleChar = catalog.characters[0];
  assert.ok(sampleChar.id, "Character must have id");
  assert.ok(sampleChar.name, "Character must have name");
  assert.ok(sampleChar.role, "Character must have role (Survivor/Killer)");

  // 2. Daily Challenge API
  const dailyRes = await fetch(`${API_BASE}/api/v1/minigames/daily?mode=classic`);
  assert.strictEqual(dailyRes.status, 200, "Daily challenge endpoint must return 200");
  const daily = await dailyRes.json();
  assert.ok(daily.id, "Daily challenge must have id");
  assert.strictEqual(daily.game_mode, "classic");
  assert.ok(daily.challenge_date, "Daily challenge must have challenge_date");
  assert.ok(Array.isArray(daily.rounds), "Daily challenge must have rounds array");
  assert.ok(daily.rounds.length >= 1, "Daily challenge must have at least 1 round");
  assert.strictEqual(daily.rounds[0].mode, "classic_character");

  // 3. Repeatable Challenge Generator API
  const repRes = await fetch(`${API_BASE}/api/v1/minigames/repeatable?mode=realm`);
  assert.strictEqual(repRes.status, 200, "Repeatable challenge endpoint must return 200");
  const rep = await repRes.json();
  assert.ok(rep.id, "Repeatable challenge must have UUID id");
  assert.strictEqual(rep.game_mode, "realm");
  assert.ok(Array.isArray(rep.rounds), "Repeatable challenge must have rounds array");
  assert.ok(rep.rounds.length >= 1, "Repeatable challenge must have at least 1 round");
  assert.strictEqual(rep.rounds[0].mode, "realm_guesser");
  assert.ok(rep.expires_at, "Repeatable challenge must have expires_at timestamp");

  // 4. Guess Evaluation API - Classic Character Guesser
  // First, submit a test guess with an intentional wrong ID or sample character
  const targetId = daily.rounds[0].target_id;
  const targetType = daily.rounds[0].target_type || "killer";
  const guessChar = catalog.characters.find(
    (c: any) => c.type === targetType && c.id !== targetId
  ) || catalog.characters[0];

  const guessRes = await fetch(`${API_BASE}/api/v1/minigames/guess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challenge_id: daily.id,
      challenge_type: "daily",
      round_index: 0,
      guess_type: guessChar.type || "killer",
      guess_id: guessChar.id,
      attempt_number: 1,
    }),
  });
  assert.strictEqual(guessRes.status, 200, "Guess evaluation endpoint must return 200");
  const guessResult = await guessRes.json();
  assert.strictEqual(typeof guessResult.is_correct, "boolean");
  assert.strictEqual(guessResult.attempt_number, 1);
  assert.ok(guessResult.guess, "Result must contain guess object");
  assert.strictEqual(guessResult.guess.id, guessChar.id);
  assert.ok(guessResult.attributes, "Result must contain attributes comparison map");
  assert.ok("role" in guessResult.attributes, "Attributes must include role");
  assert.ok("gender" in guessResult.attributes, "Attributes must include gender");

  // 4b. Cross-Role Guessing (Opposite role guessed against secret target)
  const isTargetSurvivor = targetType === "survivor";
  const crossChar = isTargetSurvivor
    ? (catalog.killers || [])[0]
    : (catalog.survivors || []).find((s: any) => s.name === "Lara Croft") || (catalog.survivors || [])[0];
  assert.ok(crossChar, "Cross-role candidate must exist in catalog");

  const crossGuessRes = await fetch(`${API_BASE}/api/v1/minigames/guess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challenge_id: daily.id,
      challenge_type: "daily",
      round_index: 0,
      guess_type: crossChar.type || (isTargetSurvivor ? "killer" : "survivor"),
      guess_id: crossChar.id,
      attempt_number: 2,
    }),
  });
  assert.strictEqual(crossGuessRes.status, 200, "Cross-role guess against daily target must succeed");
  const crossGuessResult = await crossGuessRes.json();
  assert.strictEqual(crossGuessResult.is_correct, false);
  assert.strictEqual(crossGuessResult.guess.name, crossChar.name);
  assert.strictEqual(crossGuessResult.attributes.role, "incorrect", "Role must be incorrect when guessing opposite role against secret target");

  // Submit correct guess
  const correctGuessRes = await fetch(`${API_BASE}/api/v1/minigames/guess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challenge_id: daily.id,
      challenge_type: "daily",
      round_index: 0,
      guess_type: targetType,
      guess_id: targetId,
      attempt_number: 2,
    }),
  });
  assert.strictEqual(correctGuessRes.status, 200);
  const correctResult = await correctGuessRes.json();
  assert.strictEqual(correctResult.is_correct, true, "Target guess must evaluate to is_correct = true");

  // 5. Clue Unlocks on Subsequent Attempts
  const attempt4Res = await fetch(`${API_BASE}/api/v1/minigames/guess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challenge_id: daily.id,
      challenge_type: "daily",
      round_index: 0,
      guess_type: guessChar.type || "killer",
      guess_id: guessChar.id,
      attempt_number: 4,
    }),
  });
  assert.strictEqual(attempt4Res.status, 200);
  const attempt4Result = await attempt4Res.json();
  assert.ok(attempt4Result.unlocked_clues, "Unlocked clues map must be returned");

  // 6. Custom Challenge Sharing API
  const customPayload = {
    title: "Test Community Guuntlet",
    description: "Player created gauntlet for testing",
    game_mode: "custom",
    rounds: [
      {
        round_number: 1,
        mode: "pixel_avatar",
        target_id: 1,
        target_type: "killer",
        max_attempts: 5,
        target_name: "The Trapper",
      },
      {
        round_number: 2,
        mode: "realm_guesser",
        target_id: 1,
        target_type: "realm",
        max_attempts: 4,
        target_name: "MacMillan Estate",
      },
    ],
  };

  const shareRes = await fetch(`${API_BASE}/api/v1/minigames/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: customPayload }),
  });
  assert.strictEqual(shareRes.status, 201, "Share endpoint must return 201");
  const shareData = await shareRes.json();
  assert.ok(shareData.short_code, "Share response must contain short_code");
  assert.ok(shareData.share_url, "Share response must contain share_url");

  // Fetch shared challenge by short code
  const getSharedRes = await fetch(`${API_BASE}/api/v1/minigames/shared/${shareData.short_code}`);
  assert.strictEqual(getSharedRes.status, 200, "Fetch shared challenge must return 200");
  const sharedRecord = await getSharedRes.json();
  assert.strictEqual(sharedRecord.short_code, shareData.short_code);
  assert.strictEqual(sharedRecord.title, customPayload.title);
  assert.strictEqual(sharedRecord.rounds.length, 2);

  // 7. User Registration & Stats Tracking API
  const testUser = `minigamer_${Date.now()}`;
  const regRes = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: testUser,
      email: `${testUser}@test.com`,
      password: "Password123!",
    }),
  });
  assert.strictEqual(regRes.status, 201, "User registration must return 201");
  const authData = await regRes.json();
  const userToken = authData.token;
  assert.ok(userToken, "Auth must return JWT token");

  // Update user stats
  const statUpdateRes = await fetch(`${API_BASE}/api/v1/minigames/stats`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      game_mode: "classic",
      won: true,
      attempts_taken: 3,
    }),
  });
  assert.strictEqual(statUpdateRes.status, 200, "Update stats endpoint must return 200");
  const statData = await statUpdateRes.json();
  assert.strictEqual(statData.game_mode, "classic");
  assert.strictEqual(statData.current_streak, 1);
  assert.strictEqual(statData.max_streak, 1);
  assert.strictEqual(statData.total_played, 1);
  assert.strictEqual(statData.total_won, 1);
  assert.strictEqual(statData.guess_distribution["3"], 1);

  // Fetch user stats
  const getStatsRes = await fetch(`${API_BASE}/api/v1/minigames/stats`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert.strictEqual(getStatsRes.status, 200, "Fetch stats endpoint must return 200");
  const allStats = await getStatsRes.json();
  assert.ok(allStats.stats, "Stats response must have stats object");
  assert.ok("classic" in allStats.stats, "Stats must include classic mode");
  assert.strictEqual(allStats.stats.classic.total_won, 1);

  // 8. Admin Daily Challenge Creation
  const adminLoginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "lemon", password: "lemon" }),
  });
  assert.strictEqual(adminLoginRes.status, 200, "Admin login must succeed");
  const adminToken = (await adminLoginRes.json()).token;

  const futureDate = "2026-10-15";
  const createDailyRes = await fetch(`${API_BASE}/api/v1/minigames/daily`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      challenge_date: futureDate,
      game_mode: "pixel",
      title: "Admin Pixel Guesser",
      description: "Official admin configured test pixel challenge",
      rounds: [
        {
          round_number: 1,
          mode: "pixel_avatar",
          target_id: 3,
          target_type: "killer",
          max_attempts: 6,
        },
      ],
    }),
  });
  assert.strictEqual(createDailyRes.status, 201, "Admin create daily must return 201");
  const createdDaily = await createDailyRes.json();
  assert.strictEqual(createdDaily.challenge_date, futureDate);
  assert.strictEqual(createdDaily.game_mode, "pixel");

  // Non-admin attempt should be rejected with 403
  const forbiddenRes = await fetch(`${API_BASE}/api/v1/minigames/daily`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      challenge_date: "2026-10-16",
      game_mode: "classic",
      title: "Hacked Daily",
      rounds: [],
    }),
  });
  assert.strictEqual(forbiddenRes.status, 403, "Non-admin create daily must return 403 Forbidden");

  // 9. Error and Boundary Cases
  // Missing guess_id
  const badGuessRes = await fetch(`${API_BASE}/api/v1/minigames/guess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge_id: daily.id }),
  });
  assert.strictEqual(badGuessRes.status, 400, "Missing guess_id must return 400");

  // Invalid date format
  const badDateRes = await fetch(`${API_BASE}/api/v1/minigames/daily?date=invalid-date`);
  assert.strictEqual(badDateRes.status, 400, "Invalid date format must return 400");

  // Shared link not found
  const notFoundRes = await fetch(`${API_BASE}/api/v1/minigames/shared/nonexistent_code_xyz`);
  assert.strictEqual(notFoundRes.status, 404, "Unknown shared code must return 404");
});
