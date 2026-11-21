import { describe, expect, it, vi } from "vitest";

import type { PromptSession } from "auth0-config-demo-modules/packages/core/src/index.js";
import { resolveWatchTargets, targetsFromFiles } from "./watchTargets.js";

const tenantsRoot = "/project/tenants";

function fakePrompts(): PromptSession {
  return { select: vi.fn() } as unknown as PromptSession;
}

describe("targetsFromFiles", () => {
  it("resolves a single file to its entity with just that file name", () => {
    const targets = targetsFromFiles(tenantsRoot, [
      "/project/tenants/my-tenant/clients/My App.json",
    ]);

    expect(targets).toHaveLength(1);
    expect(targets[0].entity.name).toBe("clients");
    expect(targets[0].fileNames).toEqual(new Set(["My App"]));
  });

  it("merges several files under the same entity into one target", () => {
    const targets = targetsFromFiles(tenantsRoot, [
      "/project/tenants/my-tenant/clients/App One.json",
      "/project/tenants/my-tenant/clients/App Two.json",
    ]);

    expect(targets).toHaveLength(1);
    expect(targets[0].fileNames).toEqual(new Set(["App One", "App Two"]));
  });

  it("throws for an unknown entity directory", () => {
    expect(() =>
      targetsFromFiles(tenantsRoot, [
        "/project/tenants/my-tenant/not-an-entity/Thing.json",
      ])
    ).toThrow(/Unknown entity/);
  });
});

describe("resolveWatchTargets", () => {
  it("throws when both --file and --entity are given", async () => {
    await expect(
      resolveWatchTargets(
        tenantsRoot,
        "/project/tenants/my-tenant",
        {
          file: ["/project/tenants/my-tenant/clients/App.json"],
          entity: ["clients"],
        },
        fakePrompts()
      )
    ).rejects.toThrow(/Pass only one of --file or --entity/);
  });

  it("resolves --entity names directly without prompting", async () => {
    const prompts = fakePrompts();
    const targets = await resolveWatchTargets(
      tenantsRoot,
      "/project/tenants/my-tenant",
      { entity: ["clients"] },
      prompts
    );

    expect(targets).toEqual([{ entity: expect.objectContaining({ name: "clients" }) }]);
    expect(prompts.select).not.toHaveBeenCalled();
  });

  it("throws for an unknown --entity name", async () => {
    await expect(
      resolveWatchTargets(
        tenantsRoot,
        "/project/tenants/my-tenant",
        { entity: ["not-an-entity"] },
        fakePrompts()
      )
    ).rejects.toThrow(/Unknown entity/);
  });
});
