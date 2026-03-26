import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadTicketAttachment } from "@/lib/api/upload";

function createEnvelope(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("upload api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uploads attachment and maps response to ticket attachment payload", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createEnvelope({
          url: "https://cdn.example.com/tickets/spec.pdf",
          fileName: "spec.pdf",
          size: 1024,
          mimeType: "application/pdf",
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["content"], "spec.pdf", { type: "application/pdf" });
    const attachment = await uploadTicketAttachment(file);

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/upload/attachment");
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(options.body).toBeInstanceOf(FormData);
    expect(attachment).toEqual({
      fileName: "spec.pdf",
      url: "https://cdn.example.com/tickets/spec.pdf",
      size: 1024,
      mimeType: "application/pdf",
    });
  });
});
