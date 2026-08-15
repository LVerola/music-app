import { apiRequest } from '@/lib/apiRequest';
import { guardarToken } from '@/lib/sessao';

interface RespostaLogin {
  token: string;
}

/** Autentica no backend e persiste o token da sessão. */
export async function fazerLogin(email: string, senha: string): Promise<void> {
  const { data } = await apiRequest.post<RespostaLogin>('/auth/login', {
    email: email.trim(),
    senha,
  });
  await guardarToken(data.token);
}
