import { database } from "./infra/storage/database.js";

let initialized = false;

export async function bootstrap() {
  if (!initialized) {
    await database.init();
    initialized = true;
  }
}
