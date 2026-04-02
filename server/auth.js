import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export function verifyToken(req, res, next) {
  const auth = req.headers.authorization || '';
  const [, token] = auth.split(' ');
  if (!token) return res.status(401).json({ detail: 'Missing bearer token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

export function checkRole(role) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(401).json({ detail: 'Unauthorized' });
    if (req.user.role !== role) return res.status(403).json({ detail: 'Forbidden' });
    return next();
  };
}

