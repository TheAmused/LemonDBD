// frontend/src/__tests__/unit/font-family-hardcoded.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

test("typography: no hardcoded font family, size, weight-free arbitrary values, tracking, leading or text colour (all live in app/globals.css tokens)", () => {
    try {
        execSync("tsx scripts/check-typography.ts", {
            stdio: "pipe",
            encoding: "utf-8"
        });
    } catch (error: any) {
        const output = error.stdout?.toString() || error.stderr?.toString() || error.message;
        assert.fail(`Hardcoded typography detected:\n\n${output}`);
    }
});
