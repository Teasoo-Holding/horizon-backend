export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET || 'a-default-secret',
    expiresIn: '15m',
  },
});
