# Decisões — fluxo de login

Decisões tomadas sem confirmação do utilizador (indisponível):

1. **Armazenamento do token**: `expo-secure-store` (`lib/sessao.ts`), por ser o padrão seguro no Expo para credenciais — evita `AsyncStorage`, que não é encriptado. Requer `npx expo install expo-secure-store` (não instalado, conforme instruções).
2. **`@/lib/apiRequest`**: assumido como *named export* de uma instância axios (`apiRequest.post(...)`). O corpo enviado é `{ email, senha }` e a resposta esperada `{ token }`, conforme o enunciado.
3. **Teclado no iPhone**: `KeyboardAvoidingView` com `behavior="padding"` (só iOS) envolvendo um `ScrollView` com `flexGrow: 1` e `keyboardShouldPersistTaps="handled"`. O conteúdo é empurrado para cima quando o teclado abre, e o botão "Entrar" permanece visível e tocável sem fechar o teclado primeiro.
4. **Navegação**: `app/index.tsx` funciona como porta de entrada — lê o token guardado e redireciona para `/home` (sessão existente) ou `/login`. Após login bem-sucedido usa-se `router.replace('/home')` para que "voltar" não regresse ao login. O logout na home limpa o token e faz `replace('/login')`.
5. **Validação**: feita no cliente antes do pedido (`lib/validacao-login.ts`) com mensagens em português brasileiro; erros da API são apresentados de forma genérica para não vazar detalhes de autenticação.
6. **Teste**: verificação mínima da validação em `lib/validacao-login.teste.ts` (assert puro, corre com `npx tsx`). Não foi executado porque o ambiente não tem dependências instaladas.
