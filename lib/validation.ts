import { z } from "zod";
import { parsePrice } from "@/lib/scraper/price";

export const OCCASIONS = [
  "BIRTHDAY",
  "CHRISTMAS",
  "SINTERKLAAS",
  "WEDDING",
  "BABY",
  "HOUSEWARMING",
  "GRADUATION",
  "OTHER",
] as const;

export const VISIBILITIES = ["PRIVATE", "LINK", "PUBLIC"] as const;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "too-short").max(60),
  email: z.string().trim().toLowerCase().email("invalid-email"),
  password: z.string().min(8, "password-too-short").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("invalid-email"),
  password: z.string().min(1, "required"),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "too-short").max(60),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "handle-too-short")
    .max(30)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "handle-invalid"),
  locale: z.enum(["nl", "en"]),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "required"),
  newPassword: z.string().min(8, "password-too-short").max(200),
});

export const listSchema = z.object({
  title: z.string().trim().min(1, "required").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  occasion: z.enum(OCCASIONS).default("OTHER"),
  eventDate: z.string().optional().or(z.literal("")),
  coverColor: z.string().default("terracotta"),
  visibility: z.enum(VISIBILITIES).default("LINK"),
});

export const giftSchema = z.object({
  title: z.string().trim().min(1, "required").max(160),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  note: z.string().trim().max(300).optional().or(z.literal("")),
  price: z.string().optional().or(z.literal("")),
  currency: z.string().trim().length(3).default("EUR"),
  url: z.string().trim().url("invalid-url").optional().or(z.literal("")),
  merchant: z.string().trim().max(80).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  priority: z.coerce.number().int().min(1).max(3).default(2),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

export const claimSchema = z.object({
  giftId: z.string().min(1),
  name: z.string().trim().min(1, "required").max(60),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

export const scrapeSchema = z.object({
  url: z.string().trim().min(1, "required"),
});

/** "19,95" / "€ 1.299,00" / "24.99" → centen. Leeg of onleesbaar → null. */
export function parsePriceInput(value: string | undefined | null) {
  return parsePrice(value)?.cents ?? null;
}

/**
 * Maakt van een naam of invoer een geldige, URL-veilige handle.
 * Staat hier (en niet in lib/auth.ts) zodat het instellingenformulier hem ook
 * in de browser kan gebruiken om live mee te typen.
 */
export function normalizeHandle(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 30);
}
