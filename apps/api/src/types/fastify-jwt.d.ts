import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      name: string;
      email: string;
    };
    user: {
      sub: string;
      name: string;
      email: string;
    };
  }
}

declare module "fastify" {
  interface FastifyRequest {
    permissions?: Set<string>;
  }
}
