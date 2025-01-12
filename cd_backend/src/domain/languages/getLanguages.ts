import { CountryData } from '../../services/coutriesApi/countriesApiClient';

export type LanguageAttributes = {
  name: string;
  code: string;
};

export function getLanguages(countriesData: CountryData[]): LanguageAttributes[] {
  const languages: LanguageAttributes[] = [];

  for (const country of countriesData) {
    for (const language of country.languages) {
      if (!languages.find((lang) => lang.code === language.iso639_1)) {
        languages.push({ name: language.name, code: language.iso639_1 });
      }
    }
  }

  return languages;
}
