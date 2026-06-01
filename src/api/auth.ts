import client from './client'

interface RegisterData {
  email: string
  firstName: string
  lastName: string
  password: string
}

export const register = (data: RegisterData) =>
  client.post('/users/', {
    email: data.email,
    first_name: data.firstName,
    last_name: data.lastName,
    password: data.password,
  })

export const login = (email: string, password: string) =>
  client.post('/auth/token/', { username: email, password })

export const refreshToken = (refresh: string) =>
  client.post('/auth/token/refresh/', { refresh })
