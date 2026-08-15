// Verificação mínima da validação de credenciais.
// Correr com: npx tsx lib/validacao-login.teste.ts
import assert from 'node:assert';

import { validarCredenciais } from './validacao-login';

assert.strictEqual(validarCredenciais('', 'senha123'), 'Informe o e-mail.');
assert.strictEqual(validarCredenciais('   ', 'senha123'), 'Informe o e-mail.');
assert.strictEqual(validarCredenciais('sem-arroba', 'senha123'), 'E-mail inválido.');
assert.strictEqual(validarCredenciais('a@b', 'senha123'), 'E-mail inválido.');
assert.strictEqual(validarCredenciais('voce@exemplo.com', ''), 'Informe a senha.');
assert.strictEqual(validarCredenciais('voce@exemplo.com', 'senha123'), null);
assert.strictEqual(validarCredenciais('  voce@exemplo.com  ', 'senha123'), null);

console.log('validacao-login: todos os casos passaram');
