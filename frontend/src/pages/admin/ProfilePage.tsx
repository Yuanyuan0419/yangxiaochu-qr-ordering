import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfileMutations, useSession } from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import { ApiError } from "@/services/api";

export default function ProfilePage() {
  const { t } = useT();
  const { data: session } = useSession();
  const m = useProfileMutations();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  useDocumentTitle(t("a.profile.title"));

  useEffect(() => {
    if (session) {
      setDisplayName(session.user.displayName);
      setEmail(session.user.email);
    }
  }, [session]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return toast.error(t("a.profile.nameRequired"));
    try {
      await m.update.mutateAsync({ displayName: displayName.trim(), email: email.trim() });
      toast.success(t("a.profile.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return setPwError(t("a.profile.pwInvalid"));
    }
    try {
      await m.password.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      toast.success(t("a.profile.pwChanged"));
    } catch (err) {
      setPwError(err instanceof ApiError && err.fields ? Object.values(err.fields)[0] : err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <>
      <PageHeader title={t("a.profile.title")} back="/admin/settings" />
      <div className="space-y-4 px-4 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("a.profile.info")}</CardTitle>
            <CardDescription>{t("a.profile.infoHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="displayName">{t("a.profile.name")}</Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("a.profile.email")}</Label>
                <Input id="email" type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <Button type="submit" size="lg" className="w-full" loading={m.update.isPending} loadingText={t("common.saving")}>
                {t("common.save")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("a.profile.password")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={savePassword} className="space-y-4" noValidate>
              <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t("a.profile.current")}</Label>
                <Input id="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("a.profile.new")}</Label>
                <Input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} aria-describedby="pw-hint" />
                <p id="pw-hint" className="text-sm text-muted-foreground">
                  {t("a.profile.pwHint")}
                </p>
              </div>
              {pwError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {pwError}
                </p>
              )}
              <Button type="submit" variant="outline" size="lg" className="w-full" loading={m.password.isPending} loadingText={t("a.profile.pwChanging")} disabled={!currentPassword || !newPassword}>
                {t("a.profile.password")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
