import {z} from "zod";
import {analysisModels} from "./operation-schema.js";
export const prospectingSchema=z.object({organization_id:z.string().uuid(),niche:z.string().trim().min(2).max(120),city:z.string().trim().min(2).max(160),target_count:z.number().int().min(1).max(30),collect_linkedin:z.boolean(),collect_contacts:z.boolean(),model:z.enum(analysisModels).default("gpt-6.1-sol")}).strict().refine(x=>x.collect_linkedin||x.collect_contacts,{message:"Selecione pelo menos um grupo de dados",path:["collect_linkedin"]});
