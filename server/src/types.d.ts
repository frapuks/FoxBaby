// Ajoute `userId` à Express.Request, renseigné par le middleware requireAuth.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
