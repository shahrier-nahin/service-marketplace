import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(255),
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  role: z.enum(["USER", "VENDOR"]), // Admins are not self-registerable
  // Required only when role === "VENDOR", validated with a refinement below
  businessName: z.string().trim().min(2).max(255).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createServiceSchema = z.object({
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().min(10).max(5000),
  category: z.string().trim().min(2).max(100),
  price: z.coerce.number().positive("Price must be greater than 0").max(1_000_000),
  // Optional: vendors may paste a direct image URL for their listing.
  // Falls back to a category stock photo in the UI when omitted (see
  // lib/images.ts), so this is never required at the schema level.
  imageUrl: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .max(2000)
    .optional()
    .or(z.literal("")),
  durationMinutes: z.coerce
    .number()
    .int()
    .positive("Duration must be a positive number of minutes")
    .max(10_000)
    .optional(),
});

export const updateServiceSchema = createServiceSchema.partial().extend({
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
});

export const createOrderSchema = z.object({
  serviceId: z.string().uuid("Invalid service ID"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
});
