import { useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { enviarFotoPerfil } from '@/services/perfil/enviar-foto-perfil';

interface AvatarFotoPerfilProps {
  /** URL da foto atual do utilizador (vinda do perfil), se existir. */
  fotoAtualUrl?: string | null;
  /** Diâmetro do avatar em pontos. */
  tamanho?: number;
  /** Chamado após upload bem-sucedido, com a URL devolvida pelo backend. */
  aoAtualizarFoto?: (urlFoto: string) => void;
}

/**
 * Opções partilhadas de câmara e galeria: `allowsEditing` abre o editor
 * nativo de crop nas duas plataformas. `aspect: [1, 1]` força o recorte
 * quadrado no Android; o iOS ignora `aspect`, mas o editor nativo do iOS
 * já recorta em quadrado por omissão — logo o comportamento é equivalente.
 */
const OPCOES_RECORTE_QUADRADO: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

export function AvatarFotoPerfil({
  fotoAtualUrl,
  tamanho = 112,
  aoAtualizarFoto,
}: AvatarFotoPerfilProps) {
  const [fotoLocalUri, setFotoLocalUri] = useState<string | null>(null);
  const [estaEnviando, setEstaEnviando] = useState(false);

  const uriExibida = fotoLocalUri ?? fotoAtualUrl ?? null;

  function abrirEscolhaDeOrigem() {
    if (estaEnviando) {
      return;
    }
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Foto de perfil',
          options: ['Tirar foto', 'Escolher da galeria', 'Cancelar'],
          cancelButtonIndex: 2,
        },
        (indice) => {
          if (indice === 0) void tirarFoto();
          if (indice === 1) void escolherDaGaleria();
        },
      );
      return;
    }
    // Android não tem ActionSheet nativo; um Alert com botões cobre o caso
    // sem adicionar dependência de bottom sheet.
    Alert.alert('Foto de perfil', 'Escolhe a origem da foto', [
      { text: 'Tirar foto', onPress: () => void tirarFoto() },
      { text: 'Escolher da galeria', onPress: () => void escolherDaGaleria() },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function tirarFoto() {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      avisarPermissaoNegada('câmara', permissao.canAskAgain);
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync(OPCOES_RECORTE_QUADRADO);
    await tratarResultado(resultado);
  }

  async function escolherDaGaleria() {
    // O expo-image-picker usa o photo picker do sistema (PHPicker no iOS,
    // Photo Picker no Android 13+), que não exige permissão de galeria.
    const resultado = await ImagePicker.launchImageLibraryAsync(OPCOES_RECORTE_QUADRADO);
    await tratarResultado(resultado);
  }

  async function tratarResultado(resultado: ImagePicker.ImagePickerResult) {
    if (resultado.canceled || resultado.assets.length === 0) {
      return;
    }
    const imagem = resultado.assets[0];
    setEstaEnviando(true);
    try {
      const resposta = await enviarFotoPerfil(imagem.uri, imagem.mimeType);
      setFotoLocalUri(imagem.uri);
      aoAtualizarFoto?.(resposta.urlFoto);
    } catch (erro) {
      console.error('Falha ao enviar foto de perfil', erro);
      Alert.alert(
        'Não foi possível atualizar a foto',
        'Verifica a tua ligação e tenta novamente.',
      );
    } finally {
      setEstaEnviando(false);
    }
  }

  function avisarPermissaoNegada(recurso: string, podePerguntarDeNovo: boolean) {
    if (podePerguntarDeNovo) {
      Alert.alert('Permissão necessária', `Precisamos de acesso à ${recurso} para continuar.`);
      return;
    }
    Alert.alert(
      'Permissão necessária',
      `O acesso à ${recurso} está bloqueado. Abre as definições para o permitir.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir definições', onPress: () => void Linking.openSettings() },
      ],
    );
  }

  const estiloCirculo = { width: tamanho, height: tamanho, borderRadius: tamanho / 2 };

  return (
    <Pressable
      onPress={abrirEscolhaDeOrigem}
      disabled={estaEnviando}
      accessibilityRole="button"
      accessibilityLabel="Alterar foto de perfil"
      accessibilityHint="Abre opções para tirar foto ou escolher da galeria"
      style={({ pressed }) => [styles.contentor, estiloCirculo, pressed && styles.pressionado]}
    >
      {uriExibida ? (
        <Image source={{ uri: uriExibida }} style={[styles.foto, estiloCirculo]} />
      ) : (
        <Ionicons name="person" size={tamanho * 0.5} color="#9ca3af" />
      )}

      {estaEnviando && (
        <View style={[styles.sobreposicao, estiloCirculo]}>
          <ActivityIndicator color="#ffffff" />
        </View>
      )}

      <View style={styles.seloCamara}>
        <Ionicons name="camera" size={16} color="#ffffff" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contentor: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
    overflow: 'visible',
  },
  pressionado: {
    opacity: 0.8,
  },
  foto: {
    resizeMode: 'cover',
  },
  sobreposicao: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  seloCamara: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
