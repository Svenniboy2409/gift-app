import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { registerAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <AuthForm mode="register" action={registerAction} />;
}
