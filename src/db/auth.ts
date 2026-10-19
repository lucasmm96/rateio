import { neon } from './client'

export const useSession = () => neon.auth.useSession()

export function useUser() {
  const { data, isPending } = useSession()
  return { user: data?.user ?? null, isPending }
}

export async function signIn(email: string, password: string) {
  return neon.auth.signIn.email({ email, password })
}

export async function signUp(email: string, password: string, name: string) {
  return neon.auth.signUp.email({ email, password, name })
}

export async function signOut() {
  return neon.auth.signOut()
}
