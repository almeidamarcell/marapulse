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
  boardId: z.string().uuid().optional(),
});

export const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  boardId: z.string().uuid().optional(),
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

export const reactionVoteSchema = z.object({
  externalId: z.string().min(1).max(500),
  label: z.string().max(200).optional(),
  url: z.string().max(2000).optional(),
  value: z.union([z.literal(1), z.literal(-1)]),
});
