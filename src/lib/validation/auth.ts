import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(120, "Full name cannot exceed 120 characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long.")
    .regex(/[A-Za-z]/, "Password must include at least one letter.")
    .regex(/[0-9]/, "Password must include at least one number."),
  universityId: z.string().uuid("Please select a valid university."),
  matricNumber: z
    .string()
    .trim()
    .max(40, "Matriculation number cannot exceed 40 characters.")
    .optional()
    .or(z.literal("")),
  department: z
    .string()
    .trim()
    .min(2, "Department is required.")
    .max(120, "Department name is too long."),
  faculty: z
    .string()
    .trim()
    .min(2, "Faculty is required.")
    .max(120, "Faculty name is too long."),
  level: z
    .string()
    .trim()
    .min(2, "Academic level is required.")
    .max(40, "Academic level is too long."),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password is too long.")
      .regex(/[A-Za-z]/, "Password must include at least one letter.")
      .regex(/[0-9]/, "Password must include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(120),
  matricNumber: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal("")),
  department: z.string().trim().min(2).max(120),
  faculty: z.string().trim().min(2).max(120),
  level: z.string().trim().min(2).max(40),
});
