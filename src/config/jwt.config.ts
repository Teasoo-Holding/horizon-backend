export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET || 'your-default-secret',
    expiresIn: '24h', // default for invites
  },
});
