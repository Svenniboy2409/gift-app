"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  changePasswordAction,
  updateProfileAction,
  type FormState,
} from "@/lib/actions/auth";
import { useOrigin } from "@/lib/hooks";
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
}: {
  name: string;
  handle: string;
  locale: string;
}) {
  const { t } = useI18n();
  const [state, formAction] = useActionState<FormState, FormData>(
    updateProfileAction,
    {},
  );
  const [handleValue, setHandleValue] = useState(handle);
  const origin = useOrigin();

  return (
    <form action={formAction} className="space-y-4">
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
