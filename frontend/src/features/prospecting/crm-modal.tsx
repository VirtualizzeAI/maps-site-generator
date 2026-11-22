"use client";
import {Dialog} from "radix-ui";
import {X} from "lucide-react";
export function CrmModal({open,onClose,title,description,busy=false,children}:{open:boolean;onClose:()=>void;title:string;description:string;busy?:boolean;children:React.ReactNode}){
 return <Dialog.Root open={open} onOpenChange={value=>{if(!value&&!busy)onClose();}}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40"/><Dialog.Content className="fixed left-1/2 top-1/2 z-[51] max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl outline-none"><div className="flex items-start justify-between gap-3"><Dialog.Title className="text-lg font-bold">{title}</Dialog.Title><Dialog.Close disabled={busy} aria-label="Fechar modal"><X size={20}/></Dialog.Close></div><Dialog.Description className="mt-2 text-sm text-slate-500">{description}</Dialog.Description><div className="mt-5">{children}</div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
