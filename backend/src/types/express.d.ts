import type { PlanType, Role } from "@prisma/client";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: Role;
      plan: PlanType;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
