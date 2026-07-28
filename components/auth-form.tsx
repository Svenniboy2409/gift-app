"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? t("common.loading") : label}
    </button>
  );
}

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "login" | "register";
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** Waar we na het inloggen heen gaan, bijv. terug naar de bewaarknop. */
  next?: string;
}) {
  const { t } = useI18n();
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const isRegister = mode === "register";

  return (
    <div className="card w-full max-w-md p-7 shadow-soft">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        {t(isRegister ? "auth.registerTitle" : "auth.loginTitle")}
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        {t(isRegister ? "auth.registerSubtitle" : "auth.loginSubtitle")}
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        {isRegister && (
          <div>
            <label className="label" htmlFor="name">
              {t("auth.name")}
            </label>
            <input
              id="name"
              name="name"
              className="field"
              autoComplete="name"
              required
              minLength={2}
            />
          </div>
        )}

        <div>
          <label className="label" htmlFor="email">
            {t("auth.email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="field"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            {t("auth.password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="field"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            minLength={isRegister ? 8 : undefined}
          />
        </div>

        {state.error && (
          <p
            role="alert"
            className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {t(`error.${state.error}` as MessageKey)}
          </p>
        )}

        <SubmitButton
          label={t(isRegister ? "auth.registerSubmit" : "auth.loginSubmit")}
        />
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {t(isRegister ? "auth.hasAccount" : "auth.noAccount")}{" "}
        <Link
          href={
            (isRegister ? "/login" : "/register") +
            (next ? `?next=${encodeURIComponent(next)}` : "")
          }
          className="font-semibold text-accent hover:underline"
        >
          {t(isRegister ? "auth.loginSubmit" : "auth.registerSubmit")}
        </Link>
      </p>
    </div>
  );
}
