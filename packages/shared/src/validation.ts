import { z } from "zod";
import { STATUSES, LOCALES } from "./constants";

export const createSuggestionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  categoryId: z.string().uuid().optional(),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const updateStatusSchema = z.object({
  status: z.enum(STATUSES),
});

export const sendCodeSchema = z.object({
  email: z.string().email(),
});

export const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
});

export const updateBoardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  locale: z.enum(LOCALES).optional(),
  isPublic: z.boolean().optional(),
});

export const identifySchema = z.object({
  externalId: z.string().min(1),
  email: z.string().email().optional(),
  name: z.string().optional(),
});
