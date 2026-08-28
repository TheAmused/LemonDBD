// frontend/src/__tests__/unit/i18n-hardcoded.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

test("i18n: codebase must not contain hardcoded JSX strings", () => {
    try {
        execSync("tsx scripts/check-hardcoded-strings.ts", {
            stdio: "pipe",
            encoding: "utf-8"
        });
    } catch (error: any) {
        const output = error.stdout?.toString() || error.stderr?.toString() || error.message;
        assert.fail(`Hardcoded strings detected:\n\n${output}`);
    }
});