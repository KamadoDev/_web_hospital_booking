import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface TokenPayload extends JwtPayload {
  userId: string;
  role: string;
}

export const generateToken = (
  payload: TokenPayload,
  expiresIn: SignOptions["expiresIn"] = "7d",
) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const decodeToken = (token: string) => {
  return jwt.decode(token);
};
