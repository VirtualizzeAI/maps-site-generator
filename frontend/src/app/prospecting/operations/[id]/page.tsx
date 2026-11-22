import {DashboardPage} from "@/features/dashboard/dashboard-page";
export default async function ProspectingOperation({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return <DashboardPage initialView="prospecting" prospectingOperationId={id}/>;
}
