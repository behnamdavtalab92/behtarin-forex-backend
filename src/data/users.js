// Mock users database
const users = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@forexsignal.com',
    password: '$2a$10$8K1p/a0dL1LXMKJLz1Z8YO1Z.1Z8YO1Z.1Z8YO1Z', // password: admin123
    theme: 'telegram',
    createdAt: new Date().toISOString()
  }
];

module.exports = users;

