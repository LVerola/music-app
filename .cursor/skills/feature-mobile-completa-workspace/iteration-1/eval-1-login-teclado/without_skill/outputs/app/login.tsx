import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fazerLogin } from '@/lib/autenticacao';
import { validarCredenciais } from '@/lib/validacao-login';

export default function TelaLogin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  async function entrar() {
    const erroValidacao = validarCredenciais(email, senha);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setErro(null);
    setAEnviar(true);
    try {
      await fazerLogin(email, senha);
      router.replace('/home');
    } catch {
      setErro('Não foi possível entrar. Verifique as credenciais e tente novamente.');
    } finally {
      setAEnviar(false);
    }
  }

  return (
    // KeyboardAvoidingView + ScrollView: no iPhone o teclado empurra o conteúdo,
    // garantindo que o botão "Entrar" nunca fica coberto.
    <KeyboardAvoidingView
      style={estilos.ecra}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          estilos.conteudo,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={estilos.titulo}>Entrar</Text>

        <View style={estilos.campo}>
          <Text style={estilos.rotulo}>E-mail</Text>
          <TextInput
            style={estilos.entrada}
            value={email}
            onChangeText={setEmail}
            placeholder="voce@exemplo.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!aEnviar}
          />
        </View>

        <View style={estilos.campo}>
          <Text style={estilos.rotulo}>Senha</Text>
          <TextInput
            style={estilos.entrada}
            value={senha}
            onChangeText={setSenha}
            placeholder="Sua senha"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            editable={!aEnviar}
            onSubmitEditing={entrar}
            returnKeyType="go"
          />
        </View>

        {erro && (
          <Text style={estilos.erro} accessibilityLiveRegion="polite">
            {erro}
          </Text>
        )}

        <Pressable
          style={({ pressed }) => [
            estilos.botao,
            (pressed || aEnviar) && estilos.botaoPressionado,
          ]}
          onPress={entrar}
          disabled={aEnviar}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
        >
          {aEnviar ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={estilos.textoBotao}>Entrar</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  ecra: {
    flex: 1,
    backgroundColor: '#fff',
  },
  conteudo: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  campo: {
    gap: 6,
  },
  rotulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  entrada: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  erro: {
    color: '#c0392b',
    fontSize: 14,
  },
  botao: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  botaoPressionado: {
    opacity: 0.7,
  },
  textoBotao: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
