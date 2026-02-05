import { env } from "../../config/env.js";
import { JsonDatabase } from "./json-database.js";

const database = new JsonDatabase(env.dataFilePath);

export { database };
