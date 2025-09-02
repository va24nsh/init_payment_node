import { Request, Response, NextFunction } from "express";
import { verify } from "jsonwebtoken";
import { redisClient } from "../config/redis";

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        email: string;
      }
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    // Verify token with Redis (as per your architecture)
    const userData = await redisClient.get(`token:${token}`);
    if (!userData) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    const user = JSON.parse(userData);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token" });
  }
};
