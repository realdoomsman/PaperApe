// Augment Express Request with user property set by auth middleware
declare namespace Express {
  interface Request {
    user: {
      id: string;
      email?: string;
      [key: string]: any;
    };
  }
}
