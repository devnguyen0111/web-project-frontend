import { afterEach, describe, expect, it, vi } from "vitest";
import { createDepositRequest } from "@/lib/api/wallet";

function createEnvelope(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("wallet api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends idempotency key when creating deposit request", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(createEnvelope({ paymentUrl: "" })));
    vi.stubGlobal("fetch", fetchMock);

    await createDepositRequest({
      amount: 100000,
      amountReal: 100000,
      exchangeRate: 1000,
      currency: "VND",
      idempotencyKey: "deposit-key-1",
      provider: "payos",
    });

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(options.body));
    expect(body.idempotencyKey).toBe("deposit-key-1");
    expect(body.coinAmount).toBe(100000);
    expect(body.amount).toBe(100000);
  });
});

