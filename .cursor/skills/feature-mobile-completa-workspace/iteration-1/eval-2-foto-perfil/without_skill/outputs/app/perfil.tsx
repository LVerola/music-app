import { StyleSheet, Text, View } from 'react-native';
import { AvatarFotoPerfil } from '@/components/perfil/avatar-foto-perfil';

export default function EcraPerfil() {
  return (
    <View style={styles.contentor}>
      <AvatarFotoPerfil
        aoAtualizarFoto={(urlFoto) => {
          // Ponto de integração: atualizar o estado global/query do perfil
          // quando o backend devolver a nova URL.
          console.log('Foto de perfil atualizada:', urlFoto);
        }}
      />
      <Text style={styles.dica}>Toca no avatar para alterar a tua foto</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contentor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  dica: {
    color: '#6b7280',
    fontSize: 14,
  },
});
