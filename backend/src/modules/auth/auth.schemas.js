import { z } from "zod";

const passwordRegex = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  symbol: /[^A-Za-z0-9]/,
};

const normalizedText = (label, min, max) =>
  z
    .string({ required_error: `${label} é obrigatório.` })
    .trim()
    .min(min, `${label} deve ter pelo menos ${min} caracteres.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`);

const strongPassword = z
  .string({ required_error: "Senha é obrigatória." })
  .min(8, "Senha deve ter pelo menos 8 caracteres.")
  .max(128, "Senha deve ter no máximo 128 caracteres.")
  .refine((value) => passwordRegex.uppercase.test(value), {
    message: "Senha deve conter letra maiúscula.",
  })
  .refine((value) => passwordRegex.lowercase.test(value), {
    message: "Senha deve conter letra minúscula.",
  })
  .refine((value) => passwordRegex.number.test(value), {
    message: "Senha deve conter número.",
  })
  .refine((value) => passwordRegex.symbol.test(value), {
    message: "Senha deve conter caractere especial.",
  });

const normalizedEmail = z
  .string({ required_error: "E-mail é obrigatório." })
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido.");

export const registerSchema = z.object({
  body: z.object({
    name: normalizedText("Nome", 3, 80),
    email: normalizedEmail,
    password: strongPassword,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: normalizedEmail,
    password: z
      .string({ required_error: "Senha é obrigatória." })
      .min(8, "Senha inválida."),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z
      .string({ required_error: "Refresh token é obrigatório." })
      .min(32, "Refresh token inválido."),
  }),
});

export const logoutSchema = refreshSchema;

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: normalizedEmail,
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string({ required_error: "Token é obrigatório." }).min(20),
    newPassword: strongPassword,
  }),
});

export const auditLogQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    type: z.string().trim().min(1).max(40).optional(),
    userId: z.string().trim().min(1).max(64).optional(),
  }),
});

export const passwordPolicySummary =
  "Mínimo 8 caracteres com letra maiúscula, letra minúscula, número e símbolo.";
