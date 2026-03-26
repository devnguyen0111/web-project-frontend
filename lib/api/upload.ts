import { apiRequest } from "@/lib/api/http";
import type { TicketMessageAttachment } from "@/lib/types";

type UploadAttachmentResponse = {
  bucketName: string;
  objectName: string;
  url: string;
  fileName: string;
  mimeType?: string;
  size?: number;
  etag?: string;
  uploadedAt?: string;
};

export async function uploadTicketAttachment(
  file: File,
): Promise<TicketMessageAttachment> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiRequest<UploadAttachmentResponse>(
    "/upload/attachment",
    {
      method: "POST",
      body: formData,
    },
  );

  return {
    fileName: response.data.fileName || file.name,
    url: response.data.url,
    size: response.data.size ?? file.size,
    mimeType: response.data.mimeType ?? file.type,
  };
}
