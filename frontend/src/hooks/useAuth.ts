import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, getToken, setToken, type User } from '../services/api'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(() => getToken() !== null)

  useEffect(() => {
    if (!getToken()) return
    api
      .me()
      .then(setUser)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) setToken(null)
      })
      .finally(() => setChecking(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await api.login(email, password)
    setToken(access_token)
    setUser(await api.me())
  }, [])

  const register = useCallback(
    async (email: string, password: string) => {
      await api.register(email, password)
      await login(email, password)
    },
    [login],
  )

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  return { user, checking, login, register, logout }
}

export type Auth = ReturnType<typeof useAuth>
