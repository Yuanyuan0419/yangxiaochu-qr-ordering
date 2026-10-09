import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin, useSession } from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

export default function LoginPage() {
  const { t } = useT();
  const session = useSession();
  const login = useLogin();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  useDocumentTitle(t("a.login.title"));

  const next = params.get("next")?.startsWith("/admin") ? params.get("next")! : "/admin";
  if (session.data) return <Navigate to={next} replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      navigate(next, { replace: true });
    } catch {
      /* rendered below */
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-6 py-6">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-10">
        <div className="mb-8">
          <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lift" aria-hidden>
            厨
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t("a.login.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("a.login.subtitle")}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">{t("a.login.email")}</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("a.login.password")}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label={showPassword ? t("a.login.hide") : t("a.login.show")}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>

          {login.isError && (
            <p role="alert" className="rounded-xl bg-primary-soft px-4 py-3 text-sm font-medium text-primary">
              {login.error.message}
            </p>
          )}

          <Button type="submit" size="xl" className="w-full" loading={login.isPending} loadingText={t("a.login.submitting")} disabled={!email || !password}>
            {t("a.login.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
