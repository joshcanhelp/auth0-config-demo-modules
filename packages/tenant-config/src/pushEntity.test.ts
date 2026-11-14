import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ManagementApiError } from "auth0-config-demo-modules/packages/core/src/index.js";
import type { Auth0ManagementApiClient, EntityDefinition } from "./entityRegistry.js";
import {
  findNewLocalFiles,
  importAllNewFiles,
  importSingleFile,
  pushEntity,
  pushSingleFile,
} from "./pushEntity.js";

const fakeEntity: EntityDefinition = {
  name: "clients",
  list: async () => [],
  get: async () => ({}),
  create: async (_api, body) => ({
    ...body,
    client_id: `created-${body.name as string}`,
  }),
  update: async (_api, id, body) => ({ ...body, client_id: id, updated: true }),
  identifierField: "client_id",
  fileName: (record) => String(record.name),
};

const fakeApi = {} as Auth0ManagementApiClient;

async function writeLocalFile(
  dir: string,
  fileName: string,
  record: Record<string, unknown>
): Promise<void> {
  await mkdir(join(dir, "clients"), { recursive: true });
  await writeFile(join(dir, "clients", `${fileName}.json`), JSON.stringify(record));
}

describe("pushSingleFile", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("updates the record and writes the response back", async () => {
    dir = await mkdtemp(join(tmpdir(), "push-test-"));
    await writeLocalFile(dir, "My App", { client_id: "abc123", name: "My App" });

    const filePath = await pushSingleFile(fakeApi, dir, fakeEntity, "My App");

    expect(filePath).toBe(join(dir, "clients", "My App.json"));
    const written = JSON.parse(await readFile(filePath, "utf-8"));
    expect(written).toEqual({ client_id: "abc123", name: "My App", updated: true });
  });

  it("throws when the file has no identifierField yet", async () => {
    dir = await mkdtemp(join(tmpdir(), "push-test-"));
    await writeLocalFile(dir, "New App", { name: "New App" });

    await expect(pushSingleFile(fakeApi, dir, fakeEntity, "New App")).rejects.toThrow(
      /is missing "client_id".*use import/
    );
  });
});

describe("pushEntity", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("pushes existing records and reports new ones separately instead of erroring", async () => {
    dir = await mkdtemp(join(tmpdir(), "push-test-"));
    await writeLocalFile(dir, "Existing App", {
      client_id: "abc123",
      name: "Existing App",
    });
    await writeLocalFile(dir, "New App", { name: "New App" });

    const result = await pushEntity(fakeApi, dir, fakeEntity);

    expect(result.pushed).toEqual([join(dir, "clients", "Existing App.json")]);
    expect(result.newFiles).toEqual(["New App"]);
    expect(result.staleFiles).toEqual([]);
  });

  it("collects a 404 into staleFiles instead of erroring the whole batch", async () => {
    dir = await mkdtemp(join(tmpdir(), "push-test-"));
    await writeLocalFile(dir, "Still Here", { client_id: "abc123", name: "Still Here" });
    await writeLocalFile(dir, "Gone App", { client_id: "def456", name: "Gone App" });

    const entityWith404: EntityDefinition = {
      ...fakeEntity,
      update: async (api, id, body) => {
        if (id === "def456") {
          throw new ManagementApiError(404, "/clients/def456", "Not Found");
        }
        return fakeEntity.update(api, id, body);
      },
    };

    const result = await pushEntity(fakeApi, dir, entityWith404);

    expect(result.pushed).toEqual([join(dir, "clients", "Still Here.json")]);
    expect(result.staleFiles).toEqual(["Gone App"]);
  });

  it("doesn't swallow an error that isn't a 404", async () => {
    dir = await mkdtemp(join(tmpdir(), "push-test-"));
    await writeLocalFile(dir, "Broken App", { client_id: "abc123", name: "Broken App" });

    const entityWith500: EntityDefinition = {
      ...fakeEntity,
      update: async () => {
        throw new ManagementApiError(500, "/clients/abc123", "Internal Server Error");
      },
    };

    await expect(pushEntity(fakeApi, dir, entityWith500)).rejects.toThrow(/500/);
  });
});

describe("findNewLocalFiles", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("lists only local files without an identifierField", async () => {
    dir = await mkdtemp(join(tmpdir(), "push-test-"));
    await writeLocalFile(dir, "Existing App", {
      client_id: "abc123",
      name: "Existing App",
    });
    await writeLocalFile(dir, "New App", { name: "New App" });

    expect(await findNewLocalFiles(dir, fakeEntity)).toEqual(["New App"]);
  });
});

describe("importSingleFile", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("creates the record and writes the response, including the new identifier", async () => {
    dir = await mkdtemp(join(tmpdir(), "push-test-"));
    await writeLocalFile(dir, "New App", { name: "New App" });

    const filePath = await importSingleFile(fakeApi, dir, fakeEntity, "New App");

    expect(filePath).toBe(join(dir, "clients", "New App.json"));
    const written = JSON.parse(await readFile(filePath, "utf-8"));
    expect(written).toEqual({ name: "New App", client_id: "created-New App" });
  });

  it("throws when the file already has an identifierField", async () => {
    dir = await mkdtemp(join(tmpdir(), "push-test-"));
    await writeLocalFile(dir, "Existing App", {
      client_id: "abc123",
      name: "Existing App",
    });

    await expect(
      importSingleFile(fakeApi, dir, fakeEntity, "Existing App")
    ).rejects.toThrow(/already has "client_id".*use push/);
  });
});

describe("importAllNewFiles", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("imports every new local file and leaves existing ones alone", async () => {
    dir = await mkdtemp(join(tmpdir(), "push-test-"));
    await writeLocalFile(dir, "Existing App", {
      client_id: "abc123",
      name: "Existing App",
    });
    await writeLocalFile(dir, "New App One", { name: "New App One" });
    await writeLocalFile(dir, "New App Two", { name: "New App Two" });

    const created = await importAllNewFiles(fakeApi, dir, fakeEntity);

    expect(created.sort()).toEqual(
      [
        join(dir, "clients", "New App One.json"),
        join(dir, "clients", "New App Two.json"),
      ].sort()
    );
    const existing = JSON.parse(
      await readFile(join(dir, "clients", "Existing App.json"), "utf-8")
    );
    expect(existing).toEqual({ client_id: "abc123", name: "Existing App" });
  });
});
