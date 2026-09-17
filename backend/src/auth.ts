import { randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { hashToken } from "./security.js";
import { store } from "./store.js";
import type { Membership, Role, User } from "./types.js";

export class ApiError extends Error { constructor(public statusCode:number,message:string){super(message)} }

export function currentUser(request:FastifyRequest):User{
  const authorization=request.headers.authorization;
  if(!authorization?.startsWith("Bearer "))throw new ApiError(401,"Token ausente");
  const digest=hashToken(authorization.slice(7).trim()),db=store.snapshot(),token=db.tokens.find(item=>item.token_hash===digest&&new Date(item.expires_at)>new Date()),user=token&&db.users.find(item=>item.id===token.user_id&&item.active);
  if(!user)throw new ApiError(401,"Token inválido");return user;
}

export function membership(userId:string,organizationId:string,roles?:Role[]):Membership{
  const item=store.snapshot().memberships.find(member=>member.user_id===userId&&member.organization_id===organizationId);
  if(!item||roles&&!roles.includes(item.role))throw new ApiError(403,"Usuário sem acesso à organização");return item;
}

export function serializeUser(user:User){
  const db=store.snapshot();return {id:user.id,name:user.name,email:user.email,organizations:db.memberships.filter(item=>item.user_id===user.id).map(item=>{const org=db.organizations.find(org=>org.id===item.organization_id)!;return{id:org.id,name:org.name,role:item.role}})};
}

export const id=()=>randomUUID();
export const now=()=>new Date().toISOString();
