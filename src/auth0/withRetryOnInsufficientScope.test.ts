import { describe, expect, it, vi } from "vitest";

import { withRetryOnInsufficientScope } from "./withRetryOnInsufficientScope.js";

const token1 = "token-1";
const token2 = "token-2";

describe("withRetryOnInsufficientScope", () => {
  it("calls fn once with the token when there is no error", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    await withRetryOnInsufficientScope(() => Promise.resolve(token1), vi.fn(), fn);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith(token1);
  });

  it("clears the cache and retries with a fresh token on insufficient_scope", async () => {
    let call = 0;
    const fetchToken = () => Promise.resolve(++call === 1 ? token1 : token2);
    const clearCache = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("insufficient_scope"))
      .mockResolvedValueOnce(undefined);

    await withRetryOnInsufficientScope(fetchToken, clearCache, fn);

    expect(clearCache).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, token1);
    expect(fn).toHaveBeenNthCalledWith(2, token2);
  });

  it("clears the cache and retries when insufficient_scope appears alongside a status code", async () => {
    let call = 0;
    const fetchToken = () => Promise.resolve(++call === 1 ? token1 : token2);
    const clearCache = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('403 {"errorCode":"insufficient_scope"}'))
      .mockResolvedValueOnce(undefined);

    await withRetryOnInsufficientScope(fetchToken, clearCache, fn);

    expect(clearCache).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("re-throws errors that are not insufficient_scope", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Network error"));
    await expect(
      withRetryOnInsufficientScope(() => Promise.resolve(token1), vi.fn(), fn)
    ).rejects.toThrow("Network error");
  });

  it("re-throws 403 errors without insufficient_scope in the message", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("403 Forbidden"));
    await expect(
      withRetryOnInsufficientScope(() => Promise.resolve(token1), vi.fn(), fn)
    ).rejects.toThrow("403 Forbidden");
  });

  it("does not retry if the second call also fails", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('403 {"errorCode":"insufficient_scope"}'))
      .mockRejectedValueOnce(new Error("still failing"));

    await expect(
      withRetryOnInsufficientScope(() => Promise.resolve(token1), vi.fn(), fn)
    ).rejects.toThrow("still failing");

    expect(fn).toHaveBeenCalledTimes(2);
  });
});
