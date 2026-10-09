import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../utils/http";
import { loginSchema, passwordSchema, profileSchema } from "../validators/auth";
import { serializeRestaurant, serializeUser } from "./serializers";

// Compared against when the email is unknown so response timing doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser", 12);

export async function login(input: z.infer<typeof loginSchema>) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized("auth.invalidCredentials");

  const membership = await prisma.restaurantUser.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  if (!membership) throw forbidden("auth.noRestaurant");
  return user;
}

export async function getSession(userId: number, restaurantId: number) {
  const [user, restaurant] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.restaurant.findUnique({ where: { id: restaurantId } }),
  ]);
  if (!user || !restaurant) throw unauthorized();
  return { user: serializeUser(user), restaurant: serializeRestaurant(restaurant) };
}

export async function getProfile(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound();
  return serializeUser(user);
}

export async function updateProfile(userId: number, input: z.infer<typeof profileSchema>) {
  if (input.email) {
    const taken = await prisma.user.findFirst({ where: { email: input.email, NOT: { id: userId } } });
    if (taken) throw conflict("auth.emailTaken");
  }
  return serializeUser(await prisma.user.update({ where: { id: userId }, data: input }));
}

export async function changePassword(userId: number, input: z.infer<typeof passwordSchema>) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound();
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw badRequest("auth.wrongPassword");
  }
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(input.newPassword, 12) } });
}
