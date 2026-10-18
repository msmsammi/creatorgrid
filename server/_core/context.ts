import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { getEmailUser } from "../auth";

type SafeUser = { id: number; name: string; email: string; role: "user" | "admin" };
export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: SafeUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: SafeUser | null = null;

  try {
    user = (await getEmailUser(opts.req)) ?? null;
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
