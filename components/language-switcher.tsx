import { getLocale } from "@/lib/i18n";
import { LanguageLinks } from "@/components/language-links";

export async function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = await getLocale();
  return (
    <nav className={`language-switcher${compact ? " compact" : ""}`} aria-label={locale === "de" ? "Sprache wählen" : "Choose language"}>
      <LanguageLinks locale={locale} />
    </nav>
  );
}
