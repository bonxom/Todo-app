import axiosInstance from "./httpClient";
import type { ChatAttachment } from "../types/domain";
const path = (conversationId: string, id?: string) =>
  `/api/ai/conversations/${encodeURIComponent(conversationId)}/attachments${id ? `/${encodeURIComponent(id)}` : ""}`;
export const attachmentService = {
  async upload(conversationId: string, file: File): Promise<ChatAttachment> {
    const data = new FormData();
    data.append("file", file);
    const response = await axiosInstance.post<{ data: ChatAttachment }>(
      path(conversationId),
      data,
      { headers: { "Content-Type": undefined } },
    );
    return response.data.data;
  },
  async get(
    conversationId: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<Blob> {
    const response = await axiosInstance.get<Blob>(path(conversationId, id), {
      responseType: "blob",
      signal,
    });
    return response.data;
  },
  async remove(conversationId: string, id: string) {
    await axiosInstance.delete(path(conversationId, id));
  },
};
