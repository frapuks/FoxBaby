import "dotenv/config";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL manquant (voir server/.env.example)");
}

// Pool de connexions partagé par toute l'application.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
