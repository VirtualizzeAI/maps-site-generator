import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { config, sitesDir } from "./config.js";
import { hashPassword } from "./security.js";
import type { Database } from "./types.js";

const databasePath=path.join(config.dataDir,"database.json");
const empty=():Database=>({organizations:[],users:[],memberships:[],tokens:[],integrations:[],operations:[],companies:[],operationCompanies:[],messages:[],events:[]});

class JsonStore {
  private data:Database=empty();
  private queue:Promise<void>=Promise.resolve();

  async initialize(){
    await mkdir(sitesDir,{recursive:true});
    try{this.data=JSON.parse(await readFile(databasePath,"utf8")) as Database}catch{this.data=empty()}
    if(!this.data.users.length){
      const now=new Date().toISOString(),organizationId=randomUUID(),userId=randomUUID();
      this.data.organizations.push({id:organizationId,name:config.organizationName,created_at:now});
      this.data.users.push({id:userId,name:config.adminName,email:config.adminEmail.toLowerCase(),password_hash:hashPassword(config.adminPassword),active:true,created_at:now,updated_at:now});
      this.data.memberships.push({organization_id:organizationId,user_id:userId,role:"admin",created_at:now});
      this.data.integrations.push({organization_id:organizationId,serper_api_key:config.serperApiKey,openai_api_key:config.openaiApiKey,openai_model:config.openaiModel,vercel_token:config.vercelToken,evolution_url:config.evolutionUrl,evolution_api_key:config.evolutionApiKey,evolution_instance:config.evolutionInstance,updated_at:now});
      await this.save();
    }
  }
  snapshot(){return structuredClone(this.data)}
  async mutate<T>(fn:(db:Database)=>T|Promise<T>):Promise<T>{
    let result!:T;
    this.queue=this.queue.then(async()=>{result=await fn(this.data);await this.persist()});
    await this.queue; return result;
  }
  private async save(){await this.persist()}
  private async persist(){const temp=`${databasePath}.tmp`;await writeFile(temp,JSON.stringify(this.data,null,2),"utf8");await rename(temp,databasePath)}
}

export const store=new JsonStore();
