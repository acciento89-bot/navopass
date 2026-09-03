import { AppEnglishLayer } from "@/components/app-english-layer";
import { getLocale } from "@/lib/i18n";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return <AppEnglishLayer enabled={locale === "en"}>{children}</AppEnglishLayer>;
}
