// frontend/src/__tests__/unit/global-styles-hardcoded.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

test("styles: codebase must not contain unscoped global styles or hardcoded colors/values", () => {
    try {
        execSync("tsx scripts/check-global-styles.ts", {
            stdio: "pipe",
            encoding: "utf-8"
        });
    } catch (error: any) {
        const output = error.stdout?.toString() || error.stderr?.toString() || error.message;
        assert.fail(`Hardcoded/global styles detected:\n\n${output}`);
    }
});
