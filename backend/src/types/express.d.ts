import type { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: number; restaurantId: number; role: UserRole };
    }
  }
}

export {};
