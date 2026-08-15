---
name: feature-mobile-completa
description: Implementa uma fatia vertical completa de uma feature mobile em React Native + Expo (Expo Router, TypeScript, NativeWind, TanStack Query, RHF+Zod) — tela, navegação, formulário, serviço HTTP, estados (loading/erro/vazio/offline), testes Jest + RNTL e E2E Maestro, com paridade Android e iOS. Use SEMPRE que o utilizador pedir para criar uma tela, fluxo, feature ou módulo novo no app mobile; quando mencionar React Native, Expo, Expo Router, app mobile, Android, iOS, tela do app, navegação mobile, push notification, deep link, ou pedir @feature-mobile-completa.
---

# Feature Mobile Completa

Skill para implementar uma **fatia vertical** completa de uma feature mobile, do tipo de dado até a tela navegável nos dois sistemas operativos. Stack padrão: **React Native + Expo (Expo Router), TypeScript estrito, NativeWind, TanStack Query, React Hook Form + Zod, Jest + React Native Testing Library, Maestro**.

Se o projeto usar outra stack (Flutter, Swift/Kotlin nativo), **mantenha os fundamentos abaixo** e adapte apenas as ferramentas e pastas.

## Fundamentos universais (qualquer stack mobile)

Estes princípios valem independentemente do framework — são o que distingue implementação mobile sénior de "tela que compila":

- **Fatia vertical** — do contrato de dados até a tela navegável, num único entregável testável.
- **Camadas** — rota/tela fina; lógica de negócio e HTTP fora do componente; estado de servidor com cache explícito (não `fetch` solto no `useEffect`).
- **Quatro estados** — toda tela com dados remotos trata loading, erro, vazio e sucesso; listas têm pull-to-refresh.
- **Formulários validados** — schema único (Zod ou equivalente) partilhado entre UI e API; mensagens em PT-BR.
- **Paridade Android/iOS** — comportamento igual por defeito; divergência só quando a convenção da plataforma exigir (e documentada).
- **Dispositivo real** — teclado, safe areas, botão voltar (Android), permissões e alvos de toque são parte da feature, não polish final.
- **Segurança** — tokens e segredos em armazenamento seguro do SO; nunca hardcoded no bundle.
- **TDD** — regra de negócio nova nasce com teste; fluxo crítico ganha E2E (Maestro, Detox ou equivalente).
- **Acessibilidade** — roles, labels e estados comunicados ao leitor de ecrã; não depender só de cor.

## Quando aplicar

- "Cria a tela de extrato no app".
- "Adiciona o fluxo de onboarding em 3 passos".
- "Implementa o formulário de perfil com foto".
- "Adiciona pull-to-refresh e paginação na listagem de pedidos".

---

## 1. Antes de codar — alinhar contexto

Faça (com brevidade) estas perguntas se a US/spec não responder:

1. **Rota e navegação** — caminho no Expo Router? Entra por tab, stack, modal? Precisa de deep link?
2. **Origem dos dados** — endpoint existe? Qual o contrato? Como se comporta sem rede?
3. **Offline** — a tela precisa funcionar offline (cache persistido) ou basta mensagem de "sem conexão"?
4. **Permissões do dispositivo** — câmara, galeria, localização, notificações? (cada uma exige texto de justificação para a App Store)
5. **Autenticação** — tela pública ou protegida? Onde vive o token? (SecureStore, nunca AsyncStorage)
6. **Comportamento por plataforma** — há diferença intencional Android vs iOS, ou paridade total?
7. **Testes esperados** — unidade para regra nova; fluxo crítico ganha um flow Maestro.

---

## 2. Estrutura mínima da fatia vertical

```
src/
├── types/<dominio>.ts                       # DTOs/entidades/enums
├── services/<dominio>/
│   ├── <dominio>.service.ts                 # chamadas HTTP via apiRequest
│   ├── <dominio>.queries.ts                 # hooks TanStack Query
│   ├── <dominio>.mutations.ts               # hooks de mutation
│   └── <dominio>.schema.ts                  # schemas Zod
├── components/<dominio>/                    # UI específica do fluxo
│   ├── lista-<dominio>.tsx
│   ├── formulario-<dominio>.tsx
│   └── __tests__/
│       └── formulario-<dominio>.test.tsx    # Jest + RNTL
└── app/                                     # rotas Expo Router (file-based)
    └── (protegido)/<dominio>/
        ├── _layout.tsx                      # stack/tabs do módulo
        ├── index.tsx                        # listagem
        └── [id].tsx                         # detalhe

.maestro/
└── <dominio>-fluxo-critico.yaml             # E2E do caminho feliz
```

**Princípios:**

- A rota (`app/**.tsx`) é **fina**: layout + composição; lógica vive em componentes e hooks.
- Chamadas HTTP **nunca** no componente — sempre num *service*; estado de servidor via TanStack Query.
- Formulários com RHF + `zodResolver`; nunca `useState` por campo.
- Estilos com NativeWind (`className`); `StyleSheet` só quando precisar de valor computado.
- Segredos e tokens em `expo-secure-store`; configuração por ambiente em `app.config.ts` + `expo-constants`, nunca hardcoded.

---

## 3. Sequência de implementação (TDD)

### Passo 1: Tipos e schema (`types/` + `schema.ts`)

```ts
// src/types/despesa.ts
export interface Despesa {
  id: string;
  descricao: string;
  valorCentavos: number;
  categoria: CategoriaDespesa;
  criadaEm: string;
}

export type CategoriaDespesa = "alimentacao" | "transporte" | "outros";
```

```ts
// src/services/despesa/despesa.schema.ts
import { z } from "zod";

export const schemaCriarDespesa = z.object({
  descricao: z.string().min(3, "Descrição precisa ter ao menos 3 caracteres"),
  valorCentavos: z.number().int().positive("Valor deve ser maior que zero"),
  categoria: z.enum(["alimentacao", "transporte", "outros"]),
});

export type FormCriarDespesa = z.infer<typeof schemaCriarDespesa>;
```

### Passo 2: Service + queries (TanStack Query)

```ts
// src/services/despesa/despesa.service.ts
import { apiRequest } from "@/lib/apiRequest";
import type { Despesa } from "@/types/despesa";
import type { FormCriarDespesa } from "./despesa.schema";

export async function obterDespesas(): Promise<Despesa[]> {
  return apiRequest.get<Despesa[]>("/despesas");
}

export async function criarDespesa(dados: FormCriarDespesa): Promise<Despesa> {
  return apiRequest.post<Despesa>("/despesas", dados);
}
```

```ts
// src/services/despesa/despesa.queries.ts
import { useQuery } from "@tanstack/react-query";
import { obterDespesas } from "./despesa.service";

export const chavesDespesas = {
  todas: ["despesas"] as const,
};

export function useDespesas() {
  return useQuery({
    queryKey: chavesDespesas.todas,
    queryFn: obterDespesas,
    staleTime: 60_000,
  });
}
```

> Para offline real, persista o cache com `@tanstack/query-async-storage-persister`. Para apenas sinalizar falta de rede, o estado de erro da query + `useNetInfo` chegam.

### Passo 3: Testes do formulário primeiro (Jest + RNTL)

```tsx
// src/components/despesa/__tests__/formulario-despesa.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { FormularioDespesa } from "../formulario-despesa";

describe("FormularioDespesa", () => {
  it("deve mostrar erro quando descrição for curta demais", async () => {
    render(<FormularioDespesa aoSalvar={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText(/descrição/i), "ab");
    fireEvent.press(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText(/ao menos 3 caracteres/i)).toBeOnTheScreen();
  });

  it("deve chamar aoSalvar com dados válidos", async () => {
    const aoSalvar = jest.fn();
    render(<FormularioDespesa aoSalvar={aoSalvar} />);

    fireEvent.changeText(screen.getByLabelText(/descrição/i), "Almoço");
    fireEvent.changeText(screen.getByLabelText(/valor/i), "25,90");
    fireEvent.press(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(aoSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ descricao: "Almoço", valorCentavos: 2590 })
      )
    );
  });
});
```

### Passo 4: Componentes (form + listagem)

```tsx
// src/components/despesa/formulario-despesa.tsx
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { View, Text, TextInput, Pressable } from "react-native";
import { schemaCriarDespesa, type FormCriarDespesa } from "@/services/despesa/despesa.schema";

interface PropsFormularioDespesa {
  aoSalvar: (dados: FormCriarDespesa) => Promise<void> | void;
  estaSalvando?: boolean;
}

export function FormularioDespesa({ aoSalvar, estaSalvando }: PropsFormularioDespesa) {
  const { control, handleSubmit, formState: { errors } } = useForm<FormCriarDespesa>({
    resolver: zodResolver(schemaCriarDespesa),
  });

  return (
    <View className="gap-4 p-4">
      <View>
        <Text className="mb-1 text-sm font-medium" nativeID="rotulo-descricao">Descrição</Text>
        <Controller
          control={control}
          name="descricao"
          render={({ field: { onChange, value } }) => (
            <TextInput
              accessibilityLabel="Descrição"
              accessibilityLabelledBy="rotulo-descricao"
              className="rounded-md border border-gray-300 px-3 py-2"
              value={value}
              onChangeText={onChange}
              returnKeyType="next"
            />
          )}
        />
        {errors.descricao && (
          <Text accessibilityRole="alert" className="mt-1 text-sm text-red-600">
            {errors.descricao.message}
          </Text>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: estaSalvando, busy: estaSalvando }}
        disabled={estaSalvando}
        onPress={handleSubmit(aoSalvar)}
        className="min-h-12 items-center justify-center rounded-md bg-blue-600 active:opacity-80 disabled:opacity-50"
      >
        <Text className="font-medium text-white">{estaSalvando ? "Salvando..." : "Salvar"}</Text>
      </Pressable>
    </View>
  );
}
```

```tsx
// src/components/despesa/lista-despesas.tsx
import { FlatList, RefreshControl, View, Text } from "react-native";
import { useDespesas } from "@/services/despesa/despesa.queries";

export function ListaDespesas() {
  const { data: despesas, isLoading, isError, refetch, isRefetching } = useDespesas();

  if (isLoading) return <EsqueletoLista quantidade={6} />;
  if (isError) return <EstadoErro aoTentarNovamente={refetch} />;
  if (!despesas?.length) return <EstadoVazio mensagem="Nenhuma despesa registada" />;

  return (
    <FlatList
      data={despesas}
      keyExtractor={(despesa) => despesa.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      contentInsetAdjustmentBehavior="automatic"
      renderItem={({ item: despesa }) => (
        <View className="border-b border-gray-100 px-4 py-3">
          <Text className="font-medium">{despesa.descricao}</Text>
          <Text className="text-sm text-gray-500">
            {(despesa.valorCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </Text>
        </View>
      )}
    />
  );
}
```

> **Sempre** trate os 4 estados (loading, erro, vazio, sucesso) + *pull-to-refresh* em listas. Use `FlatList`/`FlashList` para listas — nunca `.map` dentro de `ScrollView` (renderiza tudo, mata a performance).

### Passo 5: Rotas (Expo Router)

```tsx
// src/app/(protegido)/despesas/index.tsx
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ListaDespesas } from "@/components/despesa/lista-despesas";

export default function TelaDespesas() {
  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <Stack.Screen options={{ title: "Despesas" }} />
      <ListaDespesas />
    </SafeAreaView>
  );
}
```

- Título e opções de header na própria rota via `Stack.Screen`.
- Telas protegidas ficam no grupo `(protegido)` com verificação de sessão no `_layout.tsx` do grupo.
- Deep links: configure `scheme` no `app.config.ts`; o caminho do ficheiro já é a rota.

### Passo 6: Formulário + teclado

Todo ecrã com input precisa lidar com o teclado — no iOS ele cobre o conteúdo por defeito:

- Envolva com `KeyboardAvoidingView` (`behavior="padding"` no iOS, `undefined`/`height` no Android) ou use `react-native-keyboard-controller` se já estiver no projeto.
- `keyboardType` correto por campo (`email-address`, `numeric`, `decimal-pad`).
- `returnKeyType` + foco encadeado entre campos; o último submete.
- Teste com teclado aberto nos **dois** sistemas — é a fonte nº 1 de bug visual mobile.

### Passo 7: E2E do fluxo crítico (Maestro)

```yaml
# .maestro/despesas-criar.yaml
appId: com.exemplo.app
---
- launchApp
- tapOn: "Despesas"
- tapOn: "Nova despesa"
- tapOn:
    id: "campo-descricao"
- inputText: "Almoço de equipa"
- tapOn: "Salvar"
- assertVisible: "Almoço de equipa"
```

Um flow por fluxo crítico (criar, login, checkout). Rode em Android **e** iOS antes de dar a feature por pronta.

---

## 4. Paridade Android / iOS — checklist específico

A regra é **paridade por defeito**; divergência só quando a convenção da plataforma pedir (e documentada).

- **Safe areas**: use `SafeAreaView`/`useSafeAreaInsets` de `react-native-safe-area-context` — notch no iOS, gesture bar no Android.
- **Botão voltar físico (Android)**: todo modal/fluxo deve responder ao *hardware back*; Expo Router trata o básico, valide em wizards e modais customizados.
- **Teclado**: `KeyboardAvoidingView` com `behavior` por plataforma (Passo 6).
- **Sombras**: `shadow-*` (iOS) + `elevation` (Android) — NativeWind cobre com as classes `shadow`, confirme visualmente nos dois.
- **Toques**: use `Pressable` com feedback (`active:opacity-*` ou ripple no Android); área mínima de toque **44×44pt (iOS) / 48×48dp (Android)** — use `hitSlop` quando o ícone for menor.
- **Datas, moeda, fusos**: formate com `Intl`/`toLocaleString`, nunca concatenação manual.
- **Permissões**: peça no momento do uso (não no arranque) e trate a recusa com estado próprio; textos de justificação (`infoPlist`/`permissions` no `app.config.ts`) são obrigatórios para review das lojas.
- **`Platform.select` / ficheiros `.ios.tsx`/`.android.tsx`**: só para divergência **intencional**; se aparecer muito, é sinal de design errado.
- **Teste real**: valide em pelo menos um device/simulador de cada SO antes de entregar — dimensões, fontes e comportamento do teclado diferem.

---

## 5. Acessibilidade — mínimos não-negociáveis

- Todo elemento interativo tem `accessibilityRole` (`button`, `link`, `header`...).
- Inputs têm `accessibilityLabel`; erros de validação usam `accessibilityRole="alert"`.
- Estados comunicados via `accessibilityState` (`disabled`, `selected`, `busy`).
- Imagens informativas têm `accessibilityLabel`; decorativas `accessibilityElementsHidden`/`importantForAccessibility="no"`.
- Respeite `useWindowDimensions` + fontes escaláveis — não trave `fontSize` com `allowFontScaling={false}` sem justificação.
- Teste com TalkBack (Android) e VoiceOver (iOS) no fluxo crítico.

---

## 6. Padrões a evitar

| Anti-padrão | Por quê | Alternativa |
|---|---|---|
| `.map` dentro de `ScrollView` para listas | Renderiza tudo de uma vez | `FlatList`/`FlashList` |
| `useEffect` + `fetch` no componente | Sem cache, retry, invalidate | `useQuery` |
| Token em `AsyncStorage` | Armazenamento sem cifra | `expo-secure-store` |
| URL/chave de API hardcoded | Vaza no bundle | `app.config.ts` + env |
| Lógica pesada no JS thread durante animação | Frame drop visível | `react-native-reanimated` (UI thread) |
| Ignorar o botão voltar do Android | Fluxo quebrado em metade dos devices | Testar navegação com hardware back |
| Margens fixas em vez de safe area | Corta em notch/gesture bar | `useSafeAreaInsets` |
| `TouchableOpacity` de 20×20 sem `hitSlop` | Alvo de toque impossível | Mín. 44pt/48dp ou `hitSlop` |
| Estilo inline `style={{...}}` espalhado | Quebra consistência | NativeWind (`className`) |
| Detectar plataforma para "consertar" layout | Sintoma de bug de layout | Resolver com flexbox/safe area |
| Bibliotecas nativas fora do Expo SDK sem avaliar | Quebra o managed workflow / exige dev build | Preferir módulos Expo; se inevitável, sinalizar que exige `expo-dev-client` |

---

## 7. Checklist de entrega

- [ ] Tipos em `src/types/`, service separado, TanStack Query para estado de servidor.
- [ ] Formulário com RHF + Zod, mensagens de validação em PT-BR.
- [ ] Listagens tratam 4 estados + pull-to-refresh.
- [ ] Teclado testado nos dois SO (nada coberto, foco encadeado).
- [ ] Safe areas corretas (notch iOS, gesture bar Android).
- [ ] Botão voltar do Android funciona em todo o fluxo.
- [ ] Alvos de toque ≥ 44pt/48dp; `accessibilityRole`/`Label` presentes.
- [ ] Token/segredos em SecureStore; config por ambiente em `app.config.ts`.
- [ ] Testes unitários do form e das regras novas (Jest + RNTL).
- [ ] 1 flow Maestro para o fluxo crítico, verde em Android e iOS.
- [ ] Texto da UI em PT-BR; datas/moeda formatadas por locale.
- [ ] Lint, typecheck e testes passam.

---

## 8. Quando pedir confirmação

- Quando a feature exigir **módulo nativo fora do Expo SDK** (exige dev build / prebuild) — sinalize o custo antes.
- Quando houver **divergência intencional** de UX entre Android e iOS — confirme com design.
- Quando a feature precisar de **permissão sensível** (localização em background, contactos) — confirme a justificação para as lojas.
- Quando o requisito de **offline** não estiver claro — cache persistido e sincronização são um projeto em si.

---

## 9. Pós-entrega

- Correr `@code-review` para revisão crítica.
- Se o fluxo é crítico, garantir que o flow Maestro entrou no pipeline.
- Se aplicável, actualizar a documentação técnica da US via `@documentacao`.
