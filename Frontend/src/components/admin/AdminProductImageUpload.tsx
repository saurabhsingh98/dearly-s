"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi } from "@/lib/api";

export type StagedProductImage = {
  id: string;
  previewUrl: string;
  url: string;
  publicId: string;
  status: "uploading" | "ready" | "error";
  error?: string;
};

export type ProductImagePayload = { url: string; publicId: string; alt?: string };

async function deleteRemote(publicId: string) {
  if (!publicId) return;
  try {
    await adminApi.deleteUpload(publicId);
  } catch {
    // Best-effort; avoids blocking the form if Cloudinary is slow.
  }
}

export function useAdminProductImages() {
  const [items, setItems] = useState<StagedProductImage[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const remove = useCallback(async (id: string) => {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item) return;
    if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
    if (item.status === "ready" && item.publicId) {
      await deleteRemote(item.publicId);
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const addFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    for (const file of Array.from(fileList)) {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setItems((prev) => [
        ...prev,
        { id, previewUrl, url: previewUrl, publicId: "", status: "uploading" },
      ]);
      try {
        const formData = new FormData();
        formData.append("image", file);
        const res = await adminApi.uploadProductImage(formData);
        const url = res.data?.url;
        const publicId = res.data?.publicId;
        if (!url || !publicId) throw new Error("Upload returned no URL");
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, url, publicId, status: "ready" as const, previewUrl: url }
              : i,
          ),
        );
        URL.revokeObjectURL(previewUrl);
      } catch (err) {
        URL.revokeObjectURL(previewUrl);
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  status: "error" as const,
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : i,
          ),
        );
      }
    }
  }, []);

  const readyPayload = useCallback((): ProductImagePayload[] => {
    return itemsRef.current
      .filter((i) => i.status === "ready" && i.url && i.publicId)
      .map((i) => ({ url: i.url, publicId: i.publicId }));
  }, []);

  const clearLocal = useCallback(() => {
    for (const item of itemsRef.current) {
      if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
    }
    setItems([]);
  }, []);

  useEffect(() => {
    return () => {
      void (async () => {
        const ready = itemsRef.current.filter((i) => i.status === "ready" && i.publicId);
        await Promise.all(ready.map((i) => deleteRemote(i.publicId)));
        for (const item of itemsRef.current) {
          if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
        }
      })();
    };
  }, []);

  const hasUploading = items.some((i) => i.status === "uploading");

  return { items, addFiles, remove, readyPayload, clearLocal, hasUploading };
}

export function AdminProductImageUpload({
  items,
  onAddFiles,
  onRemove,
  disabled,
}: {
  items: StagedProductImage[];
  onAddFiles: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm">
        <span className="font-medium">Images</span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={disabled}
          onChange={(e) => {
            onAddFiles(e.target.files);
            e.target.value = "";
          }}
          className="mt-1 block w-full text-sm"
        />
      </label>
      {items.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="relative size-20 overflow-hidden rounded-md border border-line bg-white"
            >
              {item.status !== "error" ? (
                <Image src={item.url} alt="" fill className="object-cover" sizes="80px" unoptimized={item.url.startsWith("blob:")} />
              ) : (
                <span className="absolute inset-0 grid place-items-center p-1 text-center text-2xs text-red-700">
                  {item.error || "Failed"}
                </span>
              )}
              {item.status === "uploading" && (
                <span className="absolute inset-0 grid place-items-center bg-ink/40 text-2xs text-cream">
                  Uploading…
                </span>
              )}
              <button
                type="button"
                disabled={disabled || item.status === "uploading"}
                onClick={() => void onRemove(item.id)}
                className="absolute top-0.5 right-0.5 rounded bg-ink/80 px-1.5 py-0.5 text-2xs font-bold text-cream disabled:opacity-40"
                aria-label="Remove image"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
