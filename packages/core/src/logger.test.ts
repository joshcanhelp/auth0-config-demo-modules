import { afterEach, describe, expect, it, vi } from "vitest";
import { debugLog } from "./logger.js";

describe("debugLog", () => {
  const originalAuthZeroLog = process.env.AUTH0_LOG;

  afterEach(() => {
    if (originalAuthZeroLog === undefined) {
      delete process.env.AUTH0_LOG;
    } else {
      process.env.AUTH0_LOG = originalAuthZeroLog;
    }
  });

  it("logs nothing when AUTH0_LOG isn't set to debug", () => {
    delete process.env.AUTH0_LOG;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    debugLog("hello");

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("logs when AUTH0_LOG=debug", () => {
    process.env.AUTH0_LOG = "debug";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    debugLog("hello");

    expect(logSpy).toHaveBeenCalledOnce();
    logSpy.mockRestore();
  });
});
