import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import { HttpError } from "./lib/auth";
import { ObjectNotFoundError } from "./lib/objectStorage";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware((req) => ({
  publishableKey: publishableKeyFromHost(getClerkProxyHost(req) ?? "", process.env.CLERK_PUBLISHABLE_KEY),
})));

app.use("/api", router);
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const code = (err as { code?: string })?.code;
  const status = err instanceof HttpError ? err.status : err instanceof ObjectNotFoundError ? 404 : ["23503", "23505", "22P02", "22007", "23502"].includes(code ?? "") ? 400 : 500;
  if (status >= 500) req.log.error({ err }, "API request failed");
  const message = err instanceof HttpError ? err.message : err instanceof ObjectNotFoundError ? "Document not found."
    : code === "23503" ? "This record is still used by another record, or a selected related record no longer exists."
    : code === "23505" ? "This record already exists."
    : status === 400 ? "One or more fields contain an invalid value."
    : "Something went wrong. Please try again.";
  res.status(status).json({ data: null, error: { message } });
});

export default app;
