import client from './client'
import type { LangCode } from '../i18n'

export interface Profile {
  id: number
  lang: LangCode
}

export const getProfile = () => client.get<Profile>('/users/me/profile/')

export const updateProfile = (lang: LangCode) =>
  client.patch<Profile>('/users/me/profile/', { lang })
