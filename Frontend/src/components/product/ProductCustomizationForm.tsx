"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  deleteCustomizationUpload,
  uploadCustomizationImage,
} from "@/lib/customization-image-upload";
import { PERSONALIZED_FINAL_SALE_NOTE } from "@/lib/order-policy";
import type {
  CustomizationImagePublicIds,
  CustomizationValues,
} from "@/lib/product-customization";
import type { ProductCustomizationField } from "@/lib/types";

type Props = {
  fields: ProductCustomizationField[];
  values: CustomizationValues;
  imagePublicIds: CustomizationImagePublicIds;
  onChange: (values: CustomizationValues) => void;
  onImageChange: (fieldName: string, url: string, publicId: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
  error?: string | null;
};

function CustomizationImageField({
  field,
  url,
  publicId,
  onImageChange,
  onUploadingChange,
}: {
  field: ProductCustomizationField;
  url: string;
  publicId: string;
  onImageChange: (fieldName: string, url: string, publicId: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const ownedPublicIdRef = useRef<string | null>(publicId || null);

  useEffect(() => {
    ownedPublicIdRef.current = publicId || null;
  }, [publicId]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const remove = async () => {
    const pid = ownedPublicIdRef.current;
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setLocalError(null);
    setStatus("idle");
    ownedPublicIdRef.current = null;
    onImageChange(field.name, "", null);
    if (pid) await deleteCustomizationUpload(pid);
  };

  const onPick = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setLocalError(null);

    const previousPublicId = ownedPublicIdRef.current;
    if (previousPublicId) {
      await deleteCustomizationUpload(previousPublicId);
      ownedPublicIdRef.current = null;
      onImageChange(field.name, "", null);
    }

    const blobPreview = URL.createObjectURL(file);
    setPreviewUrl(blobPreview);
    setStatus("uploading");
    onUploadingChange?.(true);

    try {
      const { url: uploadedUrl, publicId: uploadedPublicId } =
        await uploadCustomizationImage(file);
      URL.revokeObjectURL(blobPreview);
      setPreviewUrl(null);
      ownedPublicIdRef.current = uploadedPublicId;
      onImageChange(field.name, uploadedUrl, uploadedPublicId);
      setStatus("idle");
    } catch (err) {
      URL.revokeObjectURL(blobPreview);
      setPreviewUrl(null);
      setStatus("error");
      setLocalError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      onUploadingChange?.(false);
    }
  };

  const displayUrl = previewUrl || url;
  const id = `custom-${field.name.replace(/\s+/g, "-")}-file`;

  return (
    <div className="block text-xs font-semibold">
      {field.name}
      {field.required && <span className="text-red-700"> *</span>}
      {!authLoading && !user ? (
        <p className="mt-1.5 text-xs font-normal text-ink-soft">
          <Link href="/login" className="font-semibold text-accent-700 underline">
            Sign in
          </Link>{" "}
          to upload a photo for this gift.
        </p>
      ) : (
        <>
          <input
            id={id}
            type="file"
            accept="image/*"
            disabled={status === "uploading" || authLoading}
            onChange={(e) => {
              void onPick(e.target.files);
              e.target.value = "";
            }}
            className="mt-1.5 block w-full text-xs font-normal file:mr-3 file:rounded-sm file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold"
          />
          {field.placeholder && (
            <p className="mt-1 text-2xs font-normal text-ink-faint">{field.placeholder}</p>
          )}
          {displayUrl ? (
            <div className="relative mt-3 size-28 overflow-hidden rounded-md border border-line bg-white">
              <Image
                src={displayUrl}
                alt=""
                fill
                className="object-cover"
                sizes="112px"
                unoptimized={displayUrl.startsWith("blob:")}
              />
              {status === "uploading" && (
                <span className="absolute inset-0 grid place-items-center bg-ink/40 text-2xs text-cream">
                  Uploading…
                </span>
              )}
              <button
                type="button"
                disabled={status === "uploading"}
                onClick={() => void remove()}
                className="absolute top-1 right-1 rounded bg-ink/80 px-1.5 py-0.5 text-2xs font-bold text-cream disabled:opacity-40"
                aria-label={`Remove ${field.name}`}
              >
                ×
              </button>
            </div>
          ) : null}
          {localError && (
            <p className="mt-2 text-2xs font-normal text-red-700" role="alert">
              {localError}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function ProductCustomizationForm({
  fields,
  values,
  imagePublicIds,
  onChange,
  onImageChange,
  onUploadingChange,
  error,
}: Props) {
  const [activeUploads, setActiveUploads] = useState<Record<string, boolean>>({});

  useEffect(() => {
    onUploadingChange?.(Object.values(activeUploads).some(Boolean));
  }, [activeUploads, onUploadingChange]);

  if (!fields.length) return null;

  const setFieldUploading = (fieldName: string, uploading: boolean) => {
    setActiveUploads((prev) => {
      const next = { ...prev };
      if (uploading) next[fieldName] = true;
      else delete next[fieldName];
      return next;
    });
  };

  return (
    <div className="mt-8 rounded-md border border-accent-400/40 bg-accent-100/50 p-5">
      <p className="text-sm font-bold text-ink">Personalise this gift</p>
      <p className="mt-1 text-2xs text-ink-faint">
        Fill in the details below — they are sent with your order. {PERSONALIZED_FINAL_SALE_NOTE}
      </p>
      <div className="mt-4 grid gap-4">
        {fields.map((field) => {
          const id = `custom-${field.name.replace(/\s+/g, "-")}`;
          const value = values[field.name] ?? "";
          const label = (
            <>
              {field.name}
              {field.required && <span className="text-red-700"> *</span>}
            </>
          );

          if (field.type === "IMAGE") {
            return (
              <CustomizationImageField
                key={field.name}
                field={field}
                url={value}
                publicId={imagePublicIds[field.name] ?? ""}
                onImageChange={onImageChange}
                onUploadingChange={(uploading) => setFieldUploading(field.name, uploading)}
              />
            );
          }

          if (field.type === "TEXTAREA") {
            return (
              <label key={field.name} htmlFor={id} className="block text-xs font-semibold">
                {label}
                <textarea
                  id={id}
                  value={value}
                  rows={3}
                  placeholder={field.placeholder}
                  onChange={(e) => onChange({ ...values, [field.name]: e.target.value })}
                  className="mt-1.5 w-full resize-none rounded-sm border border-ink/10 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-accent-600"
                />
              </label>
            );
          }

          if (field.type === "SELECT") {
            return (
              <label key={field.name} htmlFor={id} className="block text-xs font-semibold">
                {label}
                <select
                  id={id}
                  value={value}
                  onChange={(e) => onChange({ ...values, [field.name]: e.target.value })}
                  className="mt-1.5 w-full rounded-sm border border-ink/10 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-accent-600"
                >
                  <option value="">{field.placeholder || "Choose…"}</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
            );
          }

          const inputType = field.type === "NUMBER" ? "number" : "text";

          return (
            <label key={field.name} htmlFor={id} className="block text-xs font-semibold">
              {label}
              <input
                id={id}
                type={inputType}
                value={value}
                placeholder={field.placeholder}
                onChange={(e) => onChange({ ...values, [field.name]: e.target.value })}
                className="mt-1.5 w-full rounded-sm border border-ink/10 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-accent-600"
              />
            </label>
          );
        })}
      </div>
      {error && (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
