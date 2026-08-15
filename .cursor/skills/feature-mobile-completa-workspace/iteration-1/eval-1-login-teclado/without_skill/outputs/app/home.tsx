import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { limparToken } from '@/lib/sessao';

export default function TelaHome() {
  const router = useRouter();

  async function sair() {
    await limparToken();
    router.replace('/login');
  }

  return (
    <View style={estilos.ecra}>
      <Text style={estilos.titulo}>Bem-vindo!</Text>
      <Text style={estilos.subtitulo}>Sessão iniciada com sucesso.</Text>
      <Pressable style={estilos.botaoSair} onPress={sair} accessibilityRole="button">
        <Text style={estilos.textoSair}>Sair</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  ecra: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitulo: {
    fontSize: 16,
    color: '#555',
  },
  botaoSair: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  textoSair: {
    color: '#2563eb',
    fontWeight: '600',
  },
});
