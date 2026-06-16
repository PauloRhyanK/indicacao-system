import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createRjRole,
  deleteRjRole,
  getConfidencialUserRoles,
  listRjPermissionsCatalog,
  listRjRoles,
  setConfidencialUserRoles,
  setRjRolePermissions,
  updateRjRoleName,
} from "../services/rjRole.service.js";

const createRoleSchema = z.object({ name: z.string().min(1) });
const updateRoleSchema = z.object({ name: z.string().min(1) });
const rolePermissionsSchema = z.object({ permissionKeys: z.array(z.string()) });
const userRolesSchema = z.object({ roleIds: z.array(z.string().uuid()).min(1) });

export async function getRjPermissionsCatalog(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ data: listRjPermissionsCatalog() });
}

export async function getRjRoles(_request: FastifyRequest, reply: FastifyReply) {
  const data = await listRjRoles();
  return reply.send({ data });
}

export async function postRjRole(request: FastifyRequest, reply: FastifyReply) {
  const input = createRoleSchema.parse(request.body);
  const role = await createRjRole(input.name, request.user.sub);
  return reply.status(201).send({ data: role });
}

export async function patchRjRole(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateRoleSchema.parse(request.body);
  const role = await updateRjRoleName(id, input.name, request.user.sub);
  return reply.send({ data: role });
}

export async function removeRjRole(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await deleteRjRole(id, request.user.sub);
  return reply.status(204).send();
}

export async function putRjRolePermissions(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = rolePermissionsSchema.parse(request.body);
  const data = await setRjRolePermissions(id, input.permissionKeys, request.user.sub);
  return reply.send({ data });
}

export async function getRjUserRolesHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const data = await getConfidencialUserRoles(id);
  return reply.send({ data });
}

export async function putRjUserRoles(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = userRolesSchema.parse(request.body);
  const data = await setConfidencialUserRoles(id, input.roleIds, request.user.sub);
  return reply.send({ data });
}
