import "@testing-library/jest-dom";
import { vi } from "vitest";
import pt from "../i18n/locales/pt.json";

// Node.js 22+ ships a partial native localStorage that conflicts with jsdom.
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock simplificado e robusto para react-i18next usando PT como base para os testes
vi.mock("react-i18next", () => ({
  useTranslation: () => {
    return {
      t: (key: string, options?: any) => {
        const keys = key.split(".");
        let value: any = pt;

        for (const k of keys) {
          value = value?.[k];
        }

        if (typeof value === "string" && options) {
          Object.keys(options).forEach((k) => {
            value = value.replace(`{{${k}}}`, options[k]);
          });
        }

        return value || key;
      },
      i18n: {
        language: "pt",
        changeLanguage: vi.fn(),
      },
    };
  },
  initReactI18next: {
    type: "3rdParty",
    init: vi.fn(),
  },
}));
