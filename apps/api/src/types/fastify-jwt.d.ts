import "@fastify/jwt";
import type { UserRole } from "@prisma/client";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      role: UserRole;
      name: string;
      email: string;
    };
    user: {
      sub: string;
      role: UserRole;
      name: string;
      email: string;
    };
  }
}
