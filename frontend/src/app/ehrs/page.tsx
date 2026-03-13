import { EHRsPageClient } from "./EHRsPageClient";
import { fetchEHRsServer } from "@/shared/lib/server-ehr";

export default async function EHRsPage() {
  const initialData = await fetchEHRsServer();

  return <EHRsPageClient initialData={initialData} />;
}
