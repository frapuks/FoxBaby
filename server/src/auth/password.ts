import bcrypt from "bcryptjs";

// bcryptjs : implémentation 100% JS (pas de compilation native → OK sur ARM/Raspberry Pi).
export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, 10);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);
