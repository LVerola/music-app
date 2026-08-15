import { apiRequest } from '@/lib/apiRequest';
import { montarFicheiroFoto } from './ficheiro-foto';

export interface RespostaFotoPerfil {
  /** URL pública da foto devolvida pelo backend após o upload. */
  urlFoto: string;
}

/**
 * Envia a foto de perfil (já recortada) para `POST /perfil/foto` em multipart.
 * O campo do ficheiro chama-se `foto` — ajustar aqui se o contrato do backend
 * usar outro nome.
 */
export async function enviarFotoPerfil(
  uri: string,
  tipoMime?: string | null,
): Promise<RespostaFotoPerfil> {
  const formData = new FormData();
  // O FormData do React Native aceita { uri, name, type }; o cast é
  // necessário porque os typings de lib.dom só conhecem Blob/string.
  formData.append('foto', montarFicheiroFoto(uri, tipoMime) as unknown as Blob);

  const { data } = await apiRequest.post<RespostaFotoPerfil>('/perfil/foto', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
