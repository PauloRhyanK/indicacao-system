import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createRole,
  deleteRole,
  getUserRoles,
  listPermissionsCatalog,
  listRoles,
  setRolePermissions,
  setUserRoles,
  updateRoleName,
} from "../services/permission.service.js";

const createRoleSchema = z.object({ name: z.string().min(1) });
const updateRoleSchema = z.object({ name: z.string().min(1) });
const rolePermissionsSchema = z.object({
  permissionKeys: z.array(z.string()),
});
const userRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

export async function getPermissionsCatalog(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ data: listPermissionsCatalog() });
}

export async function getRoles(_request: FastifyRequest, reply: FastifyReply) {
  const data = await listRoles();
  return reply.send({ data });
}

export async function postRole(request: FastifyRequest, reply: FastifyReply) {
  const input = createRoleSchema.parse(request.body);
  const role = await createRole(input.name);
  return reply.status(201).send({
    data: {
      id: role.id,
      name: role.name,
      isSystem: role.isSystem,
      permissionKeys: role.rolePermissions.map((rp) => rp.permissionKey),
    },
  });
}

export async function patchRole(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateRoleSchema.parse(request.body);
  const role = await updateRoleName(id, input.name);
  return reply.send({ data: role });
}

export async function removeRole(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await deleteRole(id);
  return reply.status(204).send();
}

export async function putRolePermissions(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = rolePermissionsSchema.parse(request.body);
  const data = await setRolePermissions(id, input.permissionKeys);
  return reply.send({ data });
}

export async function getUserRolesHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const data = await getUserRoles(id);
  return reply.send({ data });
}

export async function putUserRoles(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = userRolesSchema.parse(request.body);
  await setUserRoles(id, input.roleIds, request.user.sub);
  const data = await getUserRoles(id);
  return reply.send({ data });
}
