import * as SecureStore from 'expo-secure-store';

const CHAVE_TOKEN = 'token_sessao';

export async function guardarToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(CHAVE_TOKEN, token);
}

export async function obterToken(): Promise<string | null> {
  return SecureStore.getItemAsync(CHAVE_TOKEN);
}

export async function limparToken(): Promise<void> {
  await SecureStore.deleteItemAsync(CHAVE_TOKEN);
}
