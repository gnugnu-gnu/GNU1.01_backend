module.exports = (req, res, next) => {
  const appPassword = req.header('X-App-Password');
  const validPassword = process.env.APP_PASSWORD;

  if (!appPassword || appPassword !== validPassword) {
    return res.status(401).json({ error: '잘못된 패스워드입니다' });
  }
  next();
};