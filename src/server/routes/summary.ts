import { Elysia } from "elysia";
import { z } from "zod";
import { currentMonth } from "@/lib/format";
import { authGuard } from "@/server/auth-macro";
import { getSummaryData } from "@/server/data/summary";

const monthQuery = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export const summaryRoutes = new Elysia({ prefix: "/summary" })
  .use(authGuard)
  .get(
    "/",
    ({ user, query }) => getSummaryData(user.id, query.month ?? currentMonth()),
    { auth: true, query: monthQuery }
  );
