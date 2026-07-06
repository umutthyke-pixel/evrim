window.ME = window.ME || {};

ME.EvolutionChain = [
    null, // Level 0 (Empty)
    { level: 1, name: 'Amip', emoji: '🦠', color: '#1abc9c', value: 5 },
    { level: 2, name: 'Bakteri', emoji: '🧫', color: '#16a085', value: 12 },
    { level: 3, name: 'Plankton', emoji: '🦐', color: '#3498db', value: 30 },
    { level: 4, name: 'Balık', emoji: '🐟', color: '#2980b9', value: 80 },
    { level: 5, name: 'Kurbağa', emoji: '🐸', color: '#2ecc71', value: 200 },
    { level: 6, name: 'Kertenkele', emoji: '🦎', color: '#27ae60', value: 500 },
    { level: 7, name: 'Kaplumbağa', emoji: '🐢', color: '#f1c40f', value: 1200 },
    { level: 8, name: 'Timsah', emoji: '🐊', color: '#f39c12', value: 3000 },
    { level: 9, name: 'Maymun', emoji: '🐒', color: '#e67e22', value: 8000 },
    { level: 10, name: 'İnsan', emoji: '🚶', color: '#d35400', value: 20000 },
    { level: 11, name: 'Uzaylı', emoji: '👽', color: '#9b59b6', value: 50000 },
    { level: 12, name: 'Tanrısal Varlık', emoji: '🌌', color: '#8e44ad', value: 150000 }
];

ME.Config = {
    cols: 9,
    rows: 9,
    baseSpawnPrice: 10,
    spawnPriceMultiplier: 1.15
};

ME.Quests = [
    { id: 1, type: 'merge', target: 5, reward: 50, title: 'Evrime Başla', desc: '5 kere hücre birleştir' },
    { id: 2, type: 'spawn', target: 10, reward: 100, title: 'Üretici', desc: '10 yeni hücre üret' },
    { id: 3, type: 'chest', target: 1, reward: 200, title: 'Şanslı Gün', desc: '1 kere şans sandığı aç' },
    { id: 4, type: 'merge', target: 50, reward: 500, title: 'Birleştirme Uzmanı', desc: '50 kere hücre birleştir' },
    { id: 5, type: 'spawn', target: 100, reward: 1000, title: 'Hücre Fabrikası', desc: '100 yeni hücre üret' },
    { id: 6, type: 'merge', target: 200, reward: 5000, title: 'Genetikçi', desc: '200 kere hücre birleştir' },
    { id: 7, type: 'chest', target: 5, reward: 2500, title: 'Hazine Avcısı', desc: '5 kere şans sandığı aç' }
];
