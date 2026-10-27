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

export async function signInWithGoogle() {
  return neon.auth.signIn.social({
    provider: 'google',
    callbackURL: import.meta.env.BASE_URL,
  })
}

export async function signOut() {
  return neon.auth.signOut()
}

// SDK 0.8.0-beta: forgetPassword é um objeto {emailOtp: fn}, não callable diretamente
export async function solicitarResetSenha(email: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (neon.auth.forgetPassword as any).emailOtp({ email })
}

export async function redefinirSenha(token: string, newPassword: string) {
  return neon.auth.resetPassword({ token, newPassword })
}

export async function atualizarNome(name: string): Promise<void> {
  const { error } = await (neon.auth as any).updateUser({ name })
  if (error) throw new Error(error.message)
}
