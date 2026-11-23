import {ExternalLink} from "lucide-react";
export function SourceLink({url,children}:{url:string;children:React.ReactNode}){
 return /^https?:\/\//i.test(url)?<a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-blue-700 underline">{children}<ExternalLink size={12} className="shrink-0"/></a>:null;
}
