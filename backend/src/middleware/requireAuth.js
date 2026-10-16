import jwt from 'jsonwebtoken';

function getCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token && req.headers.cookie) {
    token = getCookie(req.headers.cookie, 'vt_session') || getCookie(req.headers.cookie, 'verbatask_token');
  }
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: { message: 'Missing token' } 
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.merchantId = decoded.merchantId;
    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false, 
      error: { message: 'Invalid or expired token' } 
    });
  }
};