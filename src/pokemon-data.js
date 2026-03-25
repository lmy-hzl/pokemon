'use strict';

const POKEMON_LIST = [
  {
    id: 1,
    name: '妙蛙种子',
    nameEn: 'Bulbasaur',
    type: ['草', '毒'],
    hp: 45,
    maxHp: 45,
    attack: 49,
    defense: 49,
    speed: 45,
    sprite: '🌿',
    color: '#78C850',
    moves: [
      { name: '飞叶快刀', type: '草', power: 55, pp: 25, maxPp: 25, description: '飞出无数叶片攻击对手' },
      { name: '藤鞭', type: '草', power: 45, pp: 25, maxPp: 25, description: '用长藤抽打对手' },
      { name: '毒粉', type: '毒', power: 0, pp: 35, maxPp: 35, description: '撒出毒粉使对手中毒', effect: 'poison' },
      { name: '成长', type: '一般', power: 0, pp: 20, maxPp: 20, description: '提升自身攻击力', effect: 'attack_up' }
    ]
  },
  {
    id: 4,
    name: '小火龙',
    nameEn: 'Charmander',
    type: ['火'],
    hp: 39,
    maxHp: 39,
    attack: 52,
    defense: 43,
    speed: 65,
    sprite: '🔥',
    color: '#F08030',
    moves: [
      { name: '火焰冲击', type: '火', power: 65, pp: 25, maxPp: 25, description: '用火焰猛烈冲击对手' },
      { name: '金属爪', type: '钢', power: 50, pp: 35, maxPp: 35, description: '用金属般坚硬的爪子攻击' },
      { name: '烟幕', type: '一般', power: 0, pp: 20, maxPp: 20, description: '释放浓烟降低对手命中率', effect: 'accuracy_down' },
      { name: '抓', type: '一般', power: 40, pp: 35, maxPp: 35, description: '用爪子抓对手' }
    ]
  },
  {
    id: 7,
    name: '杰尼龟',
    nameEn: 'Squirtle',
    type: ['水'],
    hp: 44,
    maxHp: 44,
    attack: 48,
    defense: 65,
    speed: 43,
    sprite: '💧',
    color: '#6890F0',
    moves: [
      { name: '水枪', type: '水', power: 40, pp: 25, maxPp: 25, description: '喷射高压水柱攻击对手' },
      { name: '泡沫', type: '水', power: 65, pp: 20, maxPp: 20, description: '喷出泡沫攻击，可能降低对手速度', effect: 'speed_down' },
      { name: '撤退', type: '一般', power: 0, pp: 40, maxPp: 40, description: '提升自身防御力', effect: 'defense_up' },
      { name: '冲浪', type: '水', power: 90, pp: 15, maxPp: 15, description: '乘浪冲击周围所有目标' }
    ]
  },
  {
    id: 25,
    name: '皮卡丘',
    nameEn: 'Pikachu',
    type: ['电'],
    hp: 35,
    maxHp: 35,
    attack: 55,
    defense: 40,
    speed: 90,
    sprite: '⚡',
    color: '#F8D030',
    moves: [
      { name: '十万伏特', type: '电', power: 90, pp: 15, maxPp: 15, description: '释放强大的电力攻击对手，可能造成麻痹', effect: 'paralyze' },
      { name: '闪电', type: '电', power: 110, pp: 15, maxPp: 15, description: '从天而降的闪电，命中率略低' },
      { name: '电磁炮', type: '电', power: 120, pp: 5, maxPp: 5, description: '超强电磁炮击，命中率低' },
      { name: '撞击', type: '一般', power: 40, pp: 35, maxPp: 35, description: '全力撞向对手' }
    ]
  },
  {
    id: 94,
    name: '耿鬼',
    nameEn: 'Gengar',
    type: ['鬼', '毒'],
    hp: 60,
    maxHp: 60,
    attack: 65,
    defense: 60,
    speed: 110,
    sprite: '👻',
    color: '#705898',
    moves: [
      { name: '暗影球', type: '鬼', power: 80, pp: 15, maxPp: 15, description: '投出暗影凝聚的球，可能降低对手特防', effect: 'sp_def_down' },
      { name: '梦魇', type: '鬼', power: 0, pp: 15, maxPp: 15, description: '让对手陷入噩梦持续伤害', effect: 'nightmare' },
      { name: '催眠术', type: '超能', power: 0, pp: 20, maxPp: 20, description: '让对手陷入睡眠状态', effect: 'sleep' },
      { name: '污泥炸弹', type: '毒', power: 90, pp: 10, maxPp: 10, description: '投掷毒性污泥，可能造成中毒', effect: 'poison' }
    ]
  },
  {
    id: 131,
    name: '拉普拉斯',
    nameEn: 'Lapras',
    type: ['水', '冰'],
    hp: 130,
    maxHp: 130,
    attack: 85,
    defense: 80,
    speed: 60,
    sprite: '🌊',
    color: '#98D8D8',
    moves: [
      { name: '冰柱针', type: '冰', power: 25, pp: 20, maxPp: 20, description: '以多颗冰柱连续攻击2-5次' },
      { name: '水波', type: '水', power: 95, pp: 10, maxPp: 10, description: '引发水波猛击对手，有机率使其产生混乱' },
      { name: '冰冻光线', type: '冰', power: 90, pp: 10, maxPp: 10, description: '射出冰冷光线，可能让对手冰冻', effect: 'freeze' },
      { name: '歌声', type: '一般', power: 0, pp: 15, maxPp: 15, description: '用悦耳歌声使对手睡眠', effect: 'sleep' }
    ]
  },
  {
    id: 149,
    name: '快龙',
    nameEn: 'Dragonite',
    type: ['龙', '飞行'],
    hp: 91,
    maxHp: 91,
    attack: 134,
    defense: 95,
    speed: 80,
    sprite: '🐉',
    color: '#7038F8',
    moves: [
      { name: '龙爪', type: '龙', power: 80, pp: 15, maxPp: 15, description: '用闪耀着龙能量的爪子攻击' },
      { name: '激流', type: '水', power: 80, pp: 15, maxPp: 15, description: '凝聚水能量射出强力水柱' },
      { name: '雷电拳', type: '电', power: 75, pp: 15, maxPp: 15, description: '充电后猛然出拳' },
      { name: '暴风', type: '飞行', power: 110, pp: 10, maxPp: 10, description: '呼唤暴风袭击对手' }
    ]
  },
  {
    id: 150,
    name: '超梦',
    nameEn: 'Mewtwo',
    type: ['超能'],
    hp: 106,
    maxHp: 106,
    attack: 110,
    defense: 90,
    speed: 130,
    sprite: '🔮',
    color: '#A040A0',
    moves: [
      { name: '精神强念', type: '超能', power: 90, pp: 10, maxPp: 10, description: '集中超能力发动攻击' },
      { name: '冰冻光线', type: '冰', power: 90, pp: 10, maxPp: 10, description: '射出冰冷光线，可能让对手冰冻', effect: 'freeze' },
      { name: '火焰放射', type: '火', power: 95, pp: 15, maxPp: 15, description: '喷出熊熊烈火' },
      { name: '暗影球', type: '鬼', power: 80, pp: 15, maxPp: 15, description: '投出暗影凝聚的球' }
    ]
  },
  {
    id: 6,
    name: '喷火龙',
    nameEn: 'Charizard',
    type: ['火', '飞行'],
    hp: 78,
    maxHp: 78,
    attack: 84,
    defense: 78,
    speed: 100,
    sprite: '🦎',
    color: '#FF6B35',
    moves: [
      { name: '火焰放射', type: '火', power: 95, pp: 15, maxPp: 15, description: '喷出熊熊烈火' },
      { name: '飞翔', type: '飞行', power: 90, pp: 15, maxPp: 15, description: '冲上高空后俯冲攻击' },
      { name: '龙息', type: '龙', power: 60, pp: 20, maxPp: 20, description: '喷出龙息攻击，可能造成麻痹', effect: 'paralyze' },
      { name: '地震', type: '地面', power: 100, pp: 10, maxPp: 10, description: '引发大地震动攻击所有目标' }
    ]
  },
  {
    id: 143,
    name: '卡比兽',
    nameEn: 'Snorlax',
    type: ['一般'],
    hp: 160,
    maxHp: 160,
    attack: 110,
    defense: 65,
    speed: 30,
    sprite: '😴',
    color: '#A0A878',
    moves: [
      { name: '体重压制', type: '一般', power: 120, pp: 10, maxPp: 10, description: '用庞大的身体压制对手' },
      { name: '大嘴巴', type: '一般', power: 80, pp: 15, maxPp: 15, description: '用大嘴咬住对手' },
      { name: '地震', type: '地面', power: 100, pp: 10, maxPp: 10, description: '引发大地震动' },
      { name: '火焰放射', type: '火', power: 95, pp: 15, maxPp: 15, description: '喷出熊熊烈火' }
    ]
  }
];

const TYPE_CHART = {
  '火': { '草': 2, '冰': 2, '虫': 2, '钢': 2, '水': 0.5, '火': 0.5, '岩石': 0.5, '龙': 0.5 },
  '水': { '火': 2, '地面': 2, '岩石': 2, '草': 0.5, '水': 0.5, '龙': 0.5 },
  '草': { '水': 2, '地面': 2, '岩石': 2, '火': 0.5, '草': 0.5, '毒': 0.5, '飞行': 0.5, '虫': 0.5, '龙': 0.5 },
  '电': { '水': 2, '飞行': 2, '草': 0.5, '电': 0.5, '龙': 0.5 },
  '冰': { '草': 2, '地面': 2, '飞行': 2, '龙': 2, '火': 0.5, '水': 0.5, '冰': 0.5, '钢': 0.5 },
  '格斗': { '一般': 2, '冰': 2, '岩石': 2, '黑暗': 2, '钢': 2, '毒': 0.5, '虫': 0.5, '飞行': 0.5, '超能': 0.5, '鬼': 0 },
  '毒': { '草': 2, '仙女': 2, '毒': 0.5, '地面': 0.5, '岩石': 0.5, '鬼': 0.5, '钢': 0 },
  '地面': { '火': 2, '电': 2, '毒': 2, '岩石': 2, '钢': 2, '草': 0.5, '虫': 0.5, '飞行': 0 },
  '飞行': { '草': 2, '格斗': 2, '虫': 2, '电': 0.5, '岩石': 0.5, '钢': 0.5 },
  '超能': { '格斗': 2, '毒': 2, '超能': 0.5, '钢': 0.5, '黑暗': 0 },
  '虫': { '草': 2, '超能': 2, '黑暗': 2, '火': 0.5, '格斗': 0.5, '飞行': 0.5, '鬼': 0.5, '钢': 0.5, '仙女': 0.5 },
  '岩石': { '火': 2, '冰': 2, '飞行': 2, '虫': 2, '格斗': 0.5, '地面': 0.5, '钢': 0.5 },
  '鬼': { '超能': 2, '鬼': 2, '黑暗': 0.5, '一般': 0 },
  '龙': { '龙': 2, '钢': 0.5, '仙女': 0 },
  '黑暗': { '超能': 2, '鬼': 2, '格斗': 0.5, '黑暗': 0.5, '仙女': 0.5 },
  '钢': { '冰': 2, '岩石': 2, '仙女': 2, '火': 0.5, '水': 0.5, '电': 0.5, '格斗': 0.5, '地面': 0.5, '飞行': 0.5, '超能': 0.5, '虫': 0.5, '龙': 0.5, '钢': 0.5, '毒': 0 },
  '一般': { '岩石': 0.5, '钢': 0.5, '鬼': 0 }
};

function getTypeEffectiveness(moveType, defenderTypes) {
  let multiplier = 1;
  for (const defType of defenderTypes) {
    const chart = TYPE_CHART[moveType] || {};
    if (chart[defType] !== undefined) {
      multiplier *= chart[defType];
    }
  }
  return multiplier;
}

function calculateDamage(attacker, move, defender) {
  if (move.power === 0) return 0;
  const level = 50;
  const a = attacker.attack;
  const d = defender.defense;
  const base = (((2 * level / 5 + 2) * move.power * a / d) / 50 + 2);
  const effectiveness = getTypeEffectiveness(move.type, defender.type);
  const stab = attacker.type.includes(move.type) ? 1.5 : 1;
  const random = (Math.random() * 0.15 + 0.85);
  return Math.max(1, Math.floor(base * effectiveness * stab * random));
}

function deepClonePokemon(pokemon) {
  return JSON.parse(JSON.stringify(pokemon));
}

module.exports = { POKEMON_LIST, calculateDamage, getTypeEffectiveness, deepClonePokemon };
