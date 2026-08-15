/**
 * Helpers puros para montar o ficheiro da foto de perfil enviado por multipart.
 * Isolados do React Native para poderem ser testados com Node puro.
 */

export interface FicheiroFotoMultipart {
  uri: string;
  name: string;
  type: string;
}

const TIPOS_MIME_POR_EXTENSAO: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
  webp: 'image/webp',
};

/**
 * Infere o tipo MIME a partir da extensão do URI.
 * URIs de câmara/galeria no iOS vêm como `file:///...IMG_0001.jpg`;
 * no Android podem vir como `content://...` sem extensão — nesse caso
 * assume-se JPEG, que é o formato que o expo-image-picker produz por
 * omissão após o crop.
 */
export function inferirTipoMime(uri: string): string {
  const semQuery = uri.split('?')[0];
  const ultimoSegmento = semQuery.split('/').pop() ?? '';
  const partes = ultimoSegmento.split('.');
  if (partes.length < 2) {
    return 'image/jpeg';
  }
  const extensao = partes.pop()!.toLowerCase();
  return TIPOS_MIME_POR_EXTENSAO[extensao] ?? 'image/jpeg';
}

/**
 * Monta o objeto `{ uri, name, type }` que o FormData do React Native
 * exige para anexar ficheiros locais (formato próprio do RN, não um Blob).
 * `tipoMimeConhecido` permite usar o `mimeType` que o expo-image-picker
 * já devolve, evitando inferência quando não é preciso.
 */
export function montarFicheiroFoto(
  uri: string,
  tipoMimeConhecido?: string | null,
): FicheiroFotoMultipart {
  const type = tipoMimeConhecido ?? inferirTipoMime(uri);
  const extensao = type.split('/')[1] === 'jpeg' ? 'jpg' : type.split('/')[1];
  return {
    uri,
    name: `foto-perfil.${extensao}`,
    type,
  };
}
