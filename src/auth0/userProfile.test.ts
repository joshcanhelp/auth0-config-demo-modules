import { describe, expect, it } from "vitest";

import { CreateUserSchema, PatchUserSchema } from "./userProfile.js";

describe("CreateUserSchema", () => {
  it("requires connection", () => {
    expect(() => CreateUserSchema.parse({ email: "a@example.com" })).toThrow();
  });

  it("accepts a minimal valid body", () => {
    const result = CreateUserSchema.parse({
      connection: "Username-Password-Authentication",
    });
    expect(result.connection).toBe("Username-Password-Authentication");
  });

  it("accepts all writable fields", () => {
    const result = CreateUserSchema.parse({
      connection: "Username-Password-Authentication",
      email: "user@example.com",
      password: "secret",
      name: "Test User",
      given_name: "Test",
      family_name: "User",
      nickname: "tester",
      username: "testuser",
      blocked: false,
      email_verified: false,
      app_metadata: { role: "admin" },
      user_metadata: { theme: "dark" },
    });
    expect(result.email).toBe("user@example.com");
  });

  it("rejects an invalid email", () => {
    expect(() =>
      CreateUserSchema.parse({ connection: "con", email: "not-an-email" })
    ).toThrow();
  });

  it("rejects an invalid picture URL", () => {
    expect(() =>
      CreateUserSchema.parse({ connection: "con", picture: "not-a-url" })
    ).toThrow();
  });
});

describe("PatchUserSchema", () => {
  it("accepts an empty object", () => {
    expect(() => PatchUserSchema.parse({})).not.toThrow();
  });

  it("accepts a subset of writable fields", () => {
    const result = PatchUserSchema.parse({ name: "New Name", blocked: true });
    expect(result.name).toBe("New Name");
    expect(result.blocked).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(() => PatchUserSchema.parse({ email: "bad" })).toThrow();
  });
});
