import { OperationDetailPage } from "@/features/operations/operation-detail-page";

export default async function OperationPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <OperationDetailPage operationId={id}/>;
}
