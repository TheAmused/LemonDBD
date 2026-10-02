// frontend/src/__tests__/unit/font-family-hardcoded.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

test("fonts: no component may hardcode a font family (they live in app/globals.css)", () => {
    try {
        execSync("tsx scripts/check-fonts.ts", {
            stdio: "pipe",
            encoding: "utf-8"
        });
    } catch (error: any) {
        const output = error.stdout?.toString() || error.stderr?.toString() || error.message;
        assert.fail(`Hardcoded font families detected:\n\n${output}`);
    }
});
