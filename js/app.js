function getParam() {
    const m = location.search.match(/[?&]c=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
}

function loadActive() {
    const raw = localStorage.getItem('menu_active');
    if (raw) { try { return JSON.parse(raw); } catch (e) {} }
    return {};
}

function loadMenuData() {
    const raw = localStorage.getItem('menu_data');
    if (raw) return JSON.parse(raw);
    return {};
}

function slugify(text) {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function makeKey(cat, day, period) {
    return `${slugify(cat)}-${slugify(day)}-${slugify(period)}`;
}

function parseCSV(text) {
    if (!text || !text.trim()) return null;
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"(.*)"$/, '$1'));
        if (cols.length === headers.length && cols.some(c => c !== '')) {
            const row = {};
            headers.forEach((h, j) => { row[h] = cols[j]; });
            rows.push(row);
        }
    }

    return { headers, rows };
}

function render() {
    const container = document.getElementById('menu-container');
    const category = getParam();

    if (!category) {
        container.innerHTML = '<p class="placeholder">Lien invalide. Utilisez votre QR code.</p>';
        return;
    }

    const active = loadActive();
    const entry = active[category];

    if (!entry || !entry.day || !entry.period) {
        container.innerHTML = `<p class="placeholder">Aucun menu actif pour « ${category} ».</p>`;
        return;
    }

    const data = loadMenuData();
    const key = makeKey(category, entry.day, entry.period);
    const csv = data[key];

    if (!csv) {
        container.innerHTML = `<div class="no-menu">Aucun menu pour ${category} — ${entry.day} (${entry.period})</div>`;
        return;
    }

    const parsed = parseCSV(csv);
    if (!parsed || parsed.rows.length === 0) {
        container.innerHTML = `<div class="no-menu">Menu vide pour ${category} — ${entry.day} (${entry.period})</div>`;
        return;
    }

    let sectionsHtml = '';
    parsed.headers.forEach(header => {
        const items = parsed.rows.map(r => r[header]).filter(v => v && v.trim());
        if (items.length === 0) return;
        sectionsHtml += `
            <div class="menu-section">
                <div class="menu-section-title">${header}</div>
                <ul class="menu-items">
                    ${items.map(i => `<li>${i}</li>`).join('')}
                </ul>
            </div>`;
    });

    container.innerHTML = `
        <div class="top-logos">
            <img class="side-logo" src="Asset 18.png" alt="">
            <img class="side-logo" src="Asset 1.svg" alt="">
        </div>
        <div class="menu-title">Menu du jour</div>
        <img class="divider-img" src="divider-golden.png" alt="Séparateur doré">
        <div class="menu-day">${entry.day}</div>
        <div class="menu-period">${entry.period}</div>
        <div class="menu-sections">${sectionsHtml}</div>
        <img class="divider-img" src="divider-golden.png" alt="Séparateur doré">
        <div class="footer-note">Bon appétit</div>
    `;
}

function seedTestData() {
    if (localStorage.getItem('menu_data')) return;

    const config = { categories: ['VIP', 'VVIP'], days: ['Jour 1', 'Jour 2', 'Jour 3'], periods: ['Matin', 'Soir'] };
    localStorage.setItem('menu_config', JSON.stringify(config));

    const samples = {
        'vip': [
            'Entrée,Plat,Dessert\nSalade Caprese,Côte de bœuf grillée,Crème brûlée\nVelouté de champignons,Saumon en croûte,Tarte au citron\nCarpaccio de bœuf,Risotto aux cèpes,Mousse au chocolat\nTartare de thon,Magret de canard,Paris-Brest',
            'Entrée,Plat,Dessert\nFoie gras poêlé,Filet de bar,Tiramisu\nSalade de chèvre chaud,Blanquette de veau,Île flottante\nHuîtres gratinées,Lotte rôtie,Profiteroles\nCroustillant de chèvre,Pavé de thon,Tarte tatin',
            'Entrée,Plat,Dessert\nGravlax de saumon,Tournedos Rossini,Soufflé au chocolat\nAsperges vinaigrette,Canard laqué,Macarons\nEscargots de Bourgogne,Agneau confit,Fraisier\nCeviche de daurade,Couscous royal,Crêpes Suzette'
        ],
        'vvip': [
            'Entrée,Plat,Dessert\nCaviar sur blini,Homard thermidor,Opéra\nHuîtres chaudes,Tournedos Rossini,Soufflé Grand Marnier\nLangoustines rôties,Selle d\'agneau,Charlotte aux fruits\nTartare de wagyu,Bar en croûte de sel,Clafoutis',
            'Entrée,Plat,Dessert\nFoie gras mi-cuit,Saint-Pierre meunière,Crème brûlée\nCarpaccio de Saint-Jacques,Pigeon rôti,Paris-Brest\nVelouté de homard,Côte de veau aux morilles,Baba au rhum\nSalade de homard,Chateaubriand,Tarte tropézienne',
            'Entrée,Plat,Dessert\nTartare de thon rouge,Loup de mer en croûte,Millefeuille\nAsperges sauce mousseline,Canard à l\'orange,Crêpes Suzette\nCaviar d\'aubergine,Médaillon de veau,Île flottante\nGaspacho de betterave,Filet de biche,Macarons'
        ]
    };

    const menus = {};
    config.categories.forEach(cat => {
        const slugCat = slugify(cat);
        const catSamples = samples[slugCat] || samples['vip'];
        config.days.forEach((day, di) => {
            config.periods.forEach(period => {
                const key = makeKey(cat, day, period);
                menus[key] = catSamples[di % catSamples.length];
            });
        });
    });
    localStorage.setItem('menu_data', JSON.stringify(menus));

    const active = {};
    config.categories.forEach(c => { active[c] = { day: config.days[0], period: config.periods[0] }; });
    localStorage.setItem('menu_active', JSON.stringify(active));
}

seedTestData();
render();
