import jwt from 'jsonwebtoken';

export const signToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set — refusing to sign a token.');
  }

  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
};

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);
