import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getUser } from "@/lib/require-user";
import { currentMonth } from "@/lib/format";
import { listTransactionsData } from "@/server/data/transactions";
import { TransactionsClient } from "./transactions-client";

/*
 * Prefetch memakai filter default TransactionsContent: periode "bulan"
 * (tanpa batas bulan), jenis "expense", semua kategori. Kunci query harus
 * sama persis, kalau tidak client tetap menembak API sekali lagi.
 */
export default async function TransactionsPage() {
  const user = await getUser();
  const queryClient = new QueryClient();

  if (user) {
    await queryClient.prefetchQuery({
      queryKey: ["transactions", "bulan", "expense", currentMonth(), "semua"],
      queryFn: () =>
        listTransactionsData(user.id, { limit: 500, type: "expense" }),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TransactionsClient />
    </HydrationBoundary>
  );
}
