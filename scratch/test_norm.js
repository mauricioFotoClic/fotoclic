const normalizeString = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const includesNormalized = (target, search) => {
  if (!target || !search) return false;
  return normalizeString(target).includes(normalizeString(search));
};

console.log('Search "tenis" in "Tênis de mesa":', includesNormalized('Tênis de mesa', 'tenis'));
console.log('Search "tênis" in "Tenis de mesa":', includesNormalized('Tenis de mesa', 'tênis'));
console.log('Search "tenis" in "TENIS NO PIRAQUE":', includesNormalized('TENIS NO PIRAQUE', 'tenis'));
console.log('Search "tênis" in "TENIS NO PIRAQUE":', includesNormalized('TENIS NO PIRAQUE', 'tênis'));
