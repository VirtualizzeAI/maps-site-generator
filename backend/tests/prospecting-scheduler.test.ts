import {beforeEach,describe,expect,it,vi} from "vitest";
import type {Database} from "../src/types.js";
const fixture=vi.hoisted(()=>({db:{} as Database}));
vi.mock("../src/store.js",()=>({store:{snapshot:()=>structuredClone(fixture.db),mutate:async(fn:(db:Database)=>unknown)=>{await fn(fixture.db);}}}));
vi.mock("../src/auth.js",()=>({id:()=>"event",now:()=>new Date().toISOString()}));
vi.mock("../src/integrations/search.js",()=>({searchCompanies:vi.fn(async()=>[])}));
vi.mock("../src/prospecting-worker.js",()=>({processProspectingOperation:vi.fn(async()=>{})}));
import {processNext} from "../src/pipeline.js";
import {searchCompanies} from "../src/integrations/search.js";
import {processProspectingOperation} from "../src/prospecting-worker.js";
beforeEach(()=>{vi.clearAllMocks();fixture.db={organizations:[],users:[],memberships:[],integrations:[{organization_id:"org"}],operations:[{id:"site",organization_id:"org",status:"queued",created_at:"2026-11-20T10:00:00Z",target_count:1}],companies:[],operationCompanies:[],messages:[],events:[],prospectingOperations:[{id:"research",status:"queued",created_at:"2026-11-21T10:00:00Z"}],prospectingResults:[]} as unknown as Database;});
describe("fila compartilhada por ordem de criação",()=>{
 it("não passa pesquisas novas na frente de uma operação de sites já aguardando",async()=>{await processNext();expect(searchCompanies).toHaveBeenCalledOnce();expect(processProspectingOperation).not.toHaveBeenCalled();});
 it("executa uma pesquisa anterior antes de operações de sites novas",async()=>{fixture.db.prospectingOperations[0]!.created_at="2026-11-19T10:00:00Z";await processNext();expect(processProspectingOperation).toHaveBeenCalledWith("research");expect(searchCompanies).not.toHaveBeenCalled();});
});
