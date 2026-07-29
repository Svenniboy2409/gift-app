"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  changePasswordAction,
  updateProfileAction,
  type FormState,
} from "@/lib/actions/auth";
import { compressImage } from "@/lib/image-compress";
import { useOrigin } from "@/lib/hooks";
import { uploadErrorKey } from "@/lib/upload-errors";
import { Avatar } from "@/components/avatar";
import { ImageCropper } from "@/components/image-cropper";
import { LOCALES, type MessageKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { normalizeHandle } from "@/lib/validation";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>
      {pending ? t("common.loading") : label}
    </button>
  );
}

function Feedback({ state }: { state: FormState }) {
  const { t } = useI18n();
  if (state.error) {
    return (
      <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
        {t(`error.${state.error}` as MessageKey)}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
        {t(
          state.success === "password-changed"
            ? "settings.passwordChanged"
            : "settings.saved",
        )}
      </p>
    );
  }
  return null;
}

export function ProfileForm({
  name,
  handle,
  locale,
  avatarUrl,
  bio,
}: {
  name: string;
  handle: string;
  locale: string;
  avatarUrl: string | null;
  bio: string | null;
}) {
  const { t } = useI18n();
  const [state, formAction] = useActionState<FormState, FormData>(
    updateProfileAction,
    {},
  );
  const [handleValue, setHandleValue] = useState(handle);
  const [photo, setPhoto] = useState(avatarUrl ?? "");
  /** De gekozen foto, zolang je hem nog aan het bijsnijden bent. */
  const [cropping, setCropping] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const origin = useOrigin();

  /**
   * Eerst leesbaar maken — een foto uit de iPhone-galerij is HEIC en die krijgt
   * de browser niet zomaar op het scherm — en dan pas het bijsnijden aanbieden.
   */
  async function choose(file: File) {
    setUploading(true);
    setPhotoError(null);
    try {
      setCropping(await compressImage(file));
    } finally {
      setUploading(false);
    }
  }

  /** Dezelfde weg als een productfoto: eerst verkleinen, dan versturen. */
  async function uploadPhoto(file: File) {
    setUploading(true);
    setPhotoError(null);
    try {
      const body = new FormData();
      body.set("file", await compressImage(file, { maxSide: 640 }));
      const response = await fetch("/api/upload", { method: "POST", body });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "upload-failed");
      }
      const data = (await response.json()) as { url: string };
      setPhoto(data.url);
    } catch (error) {
      setPhotoError(t(uploadErrorKey((error as Error).message)));
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <span className="label">{t("settings.photo")}</span>
        <input type="hidden" name="avatarUrl" value={photo} />
        <div className="flex items-center gap-4">
          {uploading ? (
            <span className="skeleton size-20 rounded-full" />
          ) : (
            <Avatar name={name} src={photo} className="size-20" />
          )}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              {t("settings.photoChoose")}
            </button>
            {photo && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPhoto("")}
              >
                {t("settings.photoRemove")}
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void choose(file);
            event.target.value = "";
          }}
        />
        {photoError && <p className="mt-1 text-xs text-danger">{photoError}</p>}

        {/* Een profielfoto komt in een rondje te staan, dus die moet vierkant. */}
        {cropping && (
          <ImageCropper
            file={cropping}
            ratio={1}
            onCancel={() => setCropping(null)}
            onDone={(cropped) => {
              setCropping(null);
              void uploadPhoto(cropped);
            }}
          />
        )}
      </div>

      <div>
        <label className="label" htmlFor="settings-name">
          {t("auth.name")}
        </label>
        <input
          id="settings-name"
          name="name"
          className="field"
          defaultValue={name}
          required
          minLength={2}
        />
      </div>

      <div>
        <label className="label" htmlFor="settings-handle">
          {t("settings.handle")}
        </label>
        <input
          id="settings-handle"
          name="handle"
          className="field"
          value={handleValue}
          onChange={(event) =>
            setHandleValue(normalizeHandle(event.target.value))
          }
          required
          minLength={3}
          maxLength={30}
        />
        <p className="mt-1.5 text-xs text-subtle">
          {t("settings.handleHint", { url: `${origin}/u/${handleValue}` })}
        </p>
      </div>

      <div>
        <label className="label" htmlFor="settings-bio">
          {t("settings.bio")}{" "}
          <span className="font-normal text-subtle">({t("common.optional")})</span>
        </label>
        <textarea
          id="settings-bio"
          name="bio"
          className="field min-h-20 resize-y"
          defaultValue={bio ?? ""}
          placeholder={t("settings.bioPlaceholder")}
          maxLength={300}
        />
        <p className="mt-1.5 text-xs text-subtle">{t("settings.bioHint")}</p>
      </div>

      <div>
        <label className="label" htmlFor="settings-locale">
          {t("settings.language")}
        </label>
        <select
          id="settings-locale"
          name="locale"
          className="field"
          defaultValue={locale}
        >
          {LOCALES.map((code) => (
            <option key={code} value={code}>
              {t(`language.${code}` as MessageKey)}
            </option>
          ))}
        </select>
      </div>

      <Feedback state={state} />
      <SubmitButton label={t("settings.save")} />
    </form>
  );
}

export function PasswordForm() {
  const { t } = useI18n();
  const [state, formAction] = useActionState<FormState, FormData>(
    changePasswordAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="currentPassword">
          {t("settings.currentPassword")}
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          className="field"
          autoComplete="current-password"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="newPassword">
          {t("settings.newPassword")}
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          className="field"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>

      <Feedback state={state} />
      <SubmitButton label={t("settings.save")} />
    </form>
  );
}
