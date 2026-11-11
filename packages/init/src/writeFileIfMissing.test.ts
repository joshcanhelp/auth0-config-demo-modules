import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileIfMissing } from "./writeFileIfMissing.js";

describe("writeFileIfMissing", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes a file that doesn't exist yet, including missing parent directories", async () => {
    dir = await mkdtemp(join(tmpdir(), "init-test-"));
    const target = join(dir, "nested", "serve.ts");

    await expect(writeFileIfMissing(target, "content")).resolves.toBe("created");

    await expect(readFile(target, "utf-8")).resolves.toBe("content");
  });

  it("reports the file as already existing instead of overwriting it", async () => {
    dir = await mkdtemp(join(tmpdir(), "init-test-"));
    const target = join(dir, "serve.ts");
    await writeFile(target, "original content");

    await expect(writeFileIfMissing(target, "new content")).resolves.toBe("exists");

    await expect(readFile(target, "utf-8")).resolves.toBe("original content");
  });
});
