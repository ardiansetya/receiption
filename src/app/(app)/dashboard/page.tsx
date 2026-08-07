import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getUser } from "@/lib/require-user";
import { currentMonth } from "@/lib/format";
import { getSummaryData } from "@/server/data/summary";
import { DashboardClient } from "./dashboard-client";

/*
 * Ringkasan diambil di server dan dikirim bersama HTML. Sebelumnya angka baru
 * muncul setelah hidrasi memanggil /api/summary, jadi LCP menunggu satu
 * putaran jaringan tambahan sesudah bundel selesai dieksekusi.
 */
export default async function DashboardPage() {
  const user = await getUser();
  const queryClient = new QueryClient();

  if (user) {
    await queryClient.prefetchQuery({
      queryKey: ["summary"],
      queryFn: () => getSummaryData(user.id, currentMonth()),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
