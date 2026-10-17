import { app } from "../../packages/server/app";
import type { Env } from "../../packages/server/app";
export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, context.env);
