// Check mínimo da lógica de conversão monetária. Correr com: npx tsx lib/dinheiro.selfcheck.ts
import assert from 'node:assert';

import { converterTextoParaCentavos, formatarCentavos } from './dinheiro';

assert.strictEqual(converterTextoParaCentavos('12,34'), 1234);
assert.strictEqual(converterTextoParaCentavos('12.34'), 1234);
assert.strictEqual(converterTextoParaCentavos('1.234,56'), 123456);
assert.strictEqual(converterTextoParaCentavos('R$ 10'), 1000);
assert.strictEqual(converterTextoParaCentavos('0,5'), 50);
assert.strictEqual(converterTextoParaCentavos('7'), 700);
assert.strictEqual(converterTextoParaCentavos(''), null);
assert.strictEqual(converterTextoParaCentavos('abc'), null);
assert.strictEqual(converterTextoParaCentavos('12,345'), null);
assert.strictEqual(converterTextoParaCentavos('-5'), null);

// toLocaleString usa espaço não separável entre "R$" e o número.
assert.strictEqual(formatarCentavos(1234).replace(/\u00a0/g, ' '), 'R$ 12,34');
assert.strictEqual(formatarCentavos(0).replace(/\u00a0/g, ' '), 'R$ 0,00');

console.log('dinheiro.ts: todos os checks passaram');
