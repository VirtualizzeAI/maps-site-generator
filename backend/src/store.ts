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
      this.data.integrations.push({organization_id:organizationId,serper_api_key:config.serperApiKey,openai_api_key:config.openaiApiKey,openai_model:config.openaiModel,vercel_token:config.vercelToken,evolution_url:config.evolutionUrl,evolution_api_key:config.evolutionApiKey,evolution_instance:config.evolutionInstance,whatsapp_test_mode:config.whatsappTestMode,whatsapp_test_number:config.whatsappTestNumber,updated_at:now});
      await this.save();
    }
    let migrated=false;
    for(const integration of this.data.integrations){
      if(typeof integration.whatsapp_test_mode!=="boolean"){integration.whatsapp_test_mode=config.whatsappTestMode;migrated=true}
      if(typeof integration.whatsapp_test_number!=="string"){integration.whatsapp_test_number=config.whatsappTestNumber;migrated=true}
    }
    for(const operation of this.data.operations){
      if(operation.current_company_id===undefined){operation.current_company_id=null;migrated=true}
      if(operation.current_company_name===undefined){operation.current_company_name=null;migrated=true}
      if(operation.current_stage===undefined){operation.current_stage=null;migrated=true}
    }
    for(const message of this.data.messages){
      if(message.delivered_to===undefined){message.delivered_to=message.sent_at?message.recipient:null;migrated=true}
      if(message.test_mode===undefined){message.test_mode=false;migrated=true}
    }
    if(migrated)await this.save();
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
