import { storage, STORAGE_KEYS } from './storage'

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export interface User {
  id: number
  email: string
  created_at: string
}

export type SpotKind = 'start' | 'note'

export interface Spot {
  id: number
  name: string
  kind: SpotKind
  lat: number
  lon: number
  created_at: string
}

export interface SpotCreate {
  name: string
  kind: SpotKind
  lat: number
  lon: number
}

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let token: string | null = storage.get<string>(STORAGE_KEYS.token)

export function getToken(): string | null {
  return token
}

export function setToken(value: string | null): void {
  token = value
  if (value) storage.set(STORAGE_KEYS.token, value)
  else storage.remove(STORAGE_KEYS.token)
}

function errorMessage(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return 'Dati non validi'
  return `Errore del server (${status})`
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Server non raggiungibile')
  }
  if (res.status === 204) return undefined as T
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, errorMessage(body, res.status))
  return body as T
}

export const api = {
  register: (email: string, password: string) =>
    request<User>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>('/auth/me'),
  listSpots: () => request<Spot[]>('/spots'),
  createSpot: (spot: SpotCreate) => request<Spot>('/spots', { method: 'POST', body: JSON.stringify(spot) }),
  deleteSpot: (id: number) => request<void>(`/spots/${id}`, { method: 'DELETE' }),
}
