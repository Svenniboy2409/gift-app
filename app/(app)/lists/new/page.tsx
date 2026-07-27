import Link from "next/link";
import { createListAction } from "@/lib/actions/lists";
import { getTranslator } from "@/lib/i18n/server";
import { ListForm } from "@/components/list-form";

export default async function NewListPage() {
  const { t } = await getTranslator();

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/dashboard" className="btn btn-ghost btn-sm -ml-3 mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {t("list.back")}
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-ink">
        {t("list.new.title")}
      </h1>

      <div className="card mt-6 p-6">
        <ListForm
          action={createListAction}
          submitLabel={t("list.create")}
          initial={{
            title: "",
            description: "",
            occasion: "OTHER",
            eventDate: "",
            coverColor: "terracotta",
            visibility: "LINK",
          }}
        />
      </div>
    </div>
  );
}
