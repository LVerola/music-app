import { useCallback, useState } from 'react';

import { listarDespesas } from '@/services/despesas';
import type { Despesa } from '@/types/despesa';

interface EstadoDespesas {
  despesas: Despesa[];
  estaCarregando: boolean;
  estaAtualizando: boolean;
  erro: string | null;
  carregar: () => Promise<void>;
  atualizar: () => Promise<void>;
}

export function useDespesas(): EstadoDespesas {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [estaCarregando, setEstaCarregando] = useState(true);
  const [estaAtualizando, setEstaAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(async (modo: 'inicial' | 'atualizacao') => {
    const definirOcupado =
      modo === 'inicial' ? setEstaCarregando : setEstaAtualizando;

    definirOcupado(true);
    setErro(null);
    try {
      setDespesas(await listarDespesas());
    } catch (falha) {
      console.error('Falha ao listar despesas', falha);
      setErro('Não foi possível carregar as despesas.');
    } finally {
      definirOcupado(false);
    }
  }, []);

  const carregar = useCallback(() => buscar('inicial'), [buscar]);
  const atualizar = useCallback(() => buscar('atualizacao'), [buscar]);

  return { despesas, estaCarregando, estaAtualizando, erro, carregar, atualizar };
}
