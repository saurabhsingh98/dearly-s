import { uploadApi } from "@/lib/api";

export async function deleteCustomizationUpload(publicId: string) {
  if (!publicId) return;
  try {
    await uploadApi.deleteUpload(publicId);
  } catch {
    // Best-effort cleanup when the shopper removes or leaves the page.
  }
}

export async function uploadCustomizationImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);
  const res = await uploadApi.uploadImage(formData);
  const url = res.data?.url;
  const publicId = res.data?.publicId;
  if (!url || !publicId) throw new Error("Upload returned no URL");
  return { url, publicId };
}
