import { database } from "../../infra/storage/database.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthService } from "./auth.service.js";

const authRepository = new AuthRepository(database);
const authService = new AuthService(authRepository);

export { authRepository, authService };
