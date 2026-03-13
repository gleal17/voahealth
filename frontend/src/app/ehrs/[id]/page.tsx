import { notFound } from "next/navigation";

import { EHRDetailPageClient } from "./EHRDetailPageClient";
import { fetchEHRServer, ServerFetchError } from "@/shared/lib/server-ehr";
import type { EHRDetail } from "@/shared/types/api";

export default async function EHRDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let initialData: EHRDetail;

  try {
    initialData = await fetchEHRServer(id);
  } catch (error) {
    if (error instanceof ServerFetchError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  return <EHRDetailPageClient ehrId={id} initialData={initialData} />;
}
