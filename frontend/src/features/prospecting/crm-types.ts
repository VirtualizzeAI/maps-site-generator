import type {Operation,Result} from "./types";
export type Stage={id:string;name:string;position:number;card_count:number};
export type Board={id:string;name:string;card_count:number;stages:Stage[]};
export type Card={id:string;board_id:string;stage_id:string;result_id:string;result:Result;operation:Pick<Operation,"id"|"niche"|"city"|"model"|"collect_linkedin"|"collect_contacts">};
export type BoardDetail=Board&{cards:Card[]};
export const crmRoot="/api/v1/prospecting/crm";
