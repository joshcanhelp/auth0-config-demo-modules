import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureDirectory } from "./ensureDirectory.js";

describe("ensureDirectory", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("creates a directory that doesn't exist yet, including missing parents", async () => {
    dir = await mkdtemp(join(tmpdir(), "init-test-"));
    const target = join(dir, "nested", "tenants");

    await expect(ensureDirectory(target)).resolves.toBe("created");

    expect((await stat(target)).isDirectory()).toBe(true);
  });

  it("reports the directory as already existing instead of recreating it", async () => {
    dir = await mkdtemp(join(tmpdir(), "init-test-"));

    await expect(ensureDirectory(dir)).resolves.toBe("exists");
  });

  it("throws when the path exists and is not a directory", async () => {
    dir = await mkdtemp(join(tmpdir(), "init-test-"));
    const filePath = join(dir, "not-a-dir");
    await writeFile(filePath, "x");

    await expect(ensureDirectory(filePath)).rejects.toThrow(/not a directory/);
  });
});
