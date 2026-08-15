import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { obterToken } from '@/lib/sessao';

/** Porta de entrada: decide entre login e home conforme exista sessão guardada. */
export default function Entrada() {
  const [temSessao, setTemSessao] = useState<boolean | null>(null);

  useEffect(() => {
    obterToken().then((token) => setTemSessao(token !== null));
  }, []);

  if (temSessao === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={temSessao ? '/home' : '/login'} />;
}
