import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import { sendSuccess } from "../core/http-response.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const docsFilePath = path.resolve(currentDir, "..", "..", "docs", "openapi.json");

const docsRouter = Router();

docsRouter.get("/", async (_request, response, next) => {
  try {
    const rawContent = await fs.readFile(docsFilePath, "utf8");
    const parsed = JSON.parse(rawContent);
    return sendSuccess(response, parsed);
  } catch (error) {
    return next(error);
  }
});

export { docsRouter };
