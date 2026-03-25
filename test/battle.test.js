'use strict';

/**
 * Battle logic unit tests
 * Run: node test/battle.test.js
 */

const { POKEMON_LIST, calculateDamage, getTypeEffectiveness, deepClonePokemon } = require('../src/pokemon-data');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ ${msg}`);
    failed++;
  }
}

console.log('\n=== 宝可梦对战游戏 - 单元测试 ===\n');

// ---- Pokemon Data ----
console.log('--- 宝可梦数据测试 ---');
assert(POKEMON_LIST.length >= 10, `宝可梦列表至少10个 (当前: ${POKEMON_LIST.length})`);
POKEMON_LIST.forEach(p => {
  assert(p.id > 0, `${p.name}: ID 有效`);
  assert(p.name.length > 0, `${p.name}: 名称存在`);
  assert(p.maxHp > 0, `${p.name}: HP > 0`);
  assert(p.attack > 0, `${p.name}: 攻击 > 0`);
  assert(p.defense > 0, `${p.name}: 防御 > 0`);
  assert(p.speed > 0, `${p.name}: 速度 > 0`);
  assert(Array.isArray(p.type) && p.type.length > 0, `${p.name}: 类型有效`);
  assert(Array.isArray(p.moves) && p.moves.length === 4, `${p.name}: 有4个技能`);
  p.moves.forEach(m => {
    assert(m.name.length > 0, `  ${p.name}.${m.name}: 技能名称存在`);
    assert(m.pp > 0, `  ${p.name}.${m.name}: PP > 0`);
  });
});

// ---- Type Effectiveness ----
console.log('\n--- 属性克制测试 ---');
assert(getTypeEffectiveness('火', ['草']) === 2, '火对草: 效果绝佳 (x2)');
assert(getTypeEffectiveness('水', ['火']) === 2, '水对火: 效果绝佳 (x2)');
assert(getTypeEffectiveness('草', ['水']) === 2, '草对水: 效果绝佳 (x2)');
assert(getTypeEffectiveness('火', ['水']) === 0.5, '火对水: 效果不佳 (x0.5)');
assert(getTypeEffectiveness('地面', ['飞行']) === 0, '地面对飞行: 无效 (x0)');
assert(getTypeEffectiveness('电', ['水', '飞行']) === 4, '电对水+飞行: 效果绝佳 (x4)');

// ---- Damage Calculation ----
console.log('\n--- 伤害计算测试 ---');
const pikachu = deepClonePokemon(POKEMON_LIST.find(p => p.name === '皮卡丘'));
const squirtle = deepClonePokemon(POKEMON_LIST.find(p => p.name === '杰尼龟'));
const thunderbolt = pikachu.moves.find(m => m.name === '十万伏特');

const dmg = calculateDamage(pikachu, thunderbolt, squirtle);
assert(dmg > 0, `皮卡丘十万伏特对杰尼龟造成伤害: ${dmg}`);
// Electric vs Water should be super effective (x2), so damage should be significant
assert(dmg >= 20, `伤害 ${dmg} >= 20 (属性克制加成)`);

// Test zero-power move
const statusMove = pikachu.moves.find(m => m.power === 0);
if (statusMove) {
  const zeroDmg = calculateDamage(pikachu, statusMove, squirtle);
  assert(zeroDmg === 0, `变化技能 "${statusMove.name}" 伤害为0`);
}

// ---- deepClonePokemon ----
console.log('\n--- 克隆测试 ---');
const original = POKEMON_LIST[0];
const clone = deepClonePokemon(original);
assert(clone !== original, '克隆对象与原对象不同');
assert(clone.name === original.name, '克隆名称相同');
clone.hp = 0;
assert(original.hp === original.maxHp, '修改克隆不影响原对象');
clone.moves[0].pp = 0;
assert(original.moves[0].pp === original.moves[0].maxPp, '修改克隆技能不影响原对象');

// ---- Summary ----
console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===\n`);
process.exit(failed > 0 ? 1 : 0);
