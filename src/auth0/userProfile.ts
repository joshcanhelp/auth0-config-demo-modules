import { z } from "zod";

// All fields that can be written via the Management API.
// Exported so tenant schemas can be validated against this set.
export const writableUserFieldsShape = {
  app_metadata: z.record(z.string(), z.unknown()),
  blocked: z.boolean(),
  email: z.email(),
  email_verified: z.boolean(),
  family_name: z.string(),
  given_name: z.string(),
  name: z.string(),
  nickname: z.string(),
  phone_number: z.string(),
  phone_verified: z.boolean(),
  picture: z.string().url(),
  user_metadata: z.record(z.string(), z.unknown()),
  username: z.string(),
};

export const PatchUserSchema = z.object(writableUserFieldsShape).partial();
export type PatchUserBody = z.infer<typeof PatchUserSchema>;

export const CreateUserSchema = PatchUserSchema.extend({
  connection: z.string(),
});
export type CreateUserBody = z.infer<typeof CreateUserSchema>;
