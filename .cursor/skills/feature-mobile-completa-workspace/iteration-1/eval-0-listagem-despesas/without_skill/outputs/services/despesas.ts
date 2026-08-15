import { apiRequest } from '@/lib/apiRequest';
import type { Despesa, NovaDespesa } from '@/types/despesa';

export async function listarDespesas(): Promise<Despesa[]> {
  const { data } = await apiRequest.get<Despesa[]>('/despesas');
  return data;
}

export async function criarDespesa(novaDespesa: NovaDespesa): Promise<Despesa> {
  const { data } = await apiRequest.post<Despesa>('/despesas', novaDespesa);
  return data;
}
