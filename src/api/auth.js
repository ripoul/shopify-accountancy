import client from './client';

export const register = (data) =>
  client.post('/users/', {
    email: data.email,
    first_name: data.firstName,
    last_name: data.lastName,
    password: data.password,
  });

export const login = (email, password) =>
  client.post('/auth/token/', { username: email, password });

export const refreshToken = (refresh) =>
  client.post('/auth/token/refresh/', { refresh });
