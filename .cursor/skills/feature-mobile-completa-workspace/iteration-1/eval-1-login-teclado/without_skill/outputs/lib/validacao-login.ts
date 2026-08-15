const PADRAO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Devolve mensagem de erro ou null se as credenciais forem válidas. */
export function validarCredenciais(email: string, senha: string): string | null {
  if (!email.trim()) return 'Informe o e-mail.';
  if (!PADRAO_EMAIL.test(email.trim())) return 'E-mail inválido.';
  if (!senha) return 'Informe a senha.';
  return null;
}
