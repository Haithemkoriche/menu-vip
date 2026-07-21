const DEFAULTS = {
    categories: ['VIP', 'VVIP'],
    days: ['Jour 1', 'Jour 2', 'Jour 3'],
    periods: ['Matin', 'Soir']
};

function loadConfig() {
    const raw = localStorage.getItem('menu_config');
    if (raw) { try { return JSON.parse(raw); } catch (e) {} }
    return { ...DEFAULTS };
}

function saveConfig(cfg) { localStorage.setItem('menu_config', JSON.stringify(cfg)); }

function loadMenuData() {
    const raw = localStorage.getItem('menu_data');
    if (raw) { try { return JSON.parse(raw); } catch (e) {} }
    return {};
}

function saveMenuData(data) { localStorage.setItem('menu_data', JSON.stringify(data)); }

function loadActive() {
    const raw = localStorage.getItem('menu_active');
    if (raw) { try { return JSON.parse(raw); } catch (e) {} }
    return {};
}

function saveActive(active) { localStorage.setItem('menu_active', JSON.stringify(active)); }

function slugify(text) {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function makeKey(cat, day, period) {
    return `${slugify(cat)}-${slugify(day)}-${slugify(period)}`;
}

function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2000);
}

function renderTagList(containerId, items, onDelete) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    items.forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.innerHTML = `${item} <span class="tag-del">&times;</span>`;
        tag.querySelector('.tag-del').addEventListener('click', () => onDelete(item));
        container.appendChild(tag);
    });
}

function renderActivationPanel(cfg) {
    const panel = document.getElementById('activation-panel');
    const active = loadActive();
    panel.innerHTML = '';

    if (cfg.categories.length === 0) return;

    cfg.categories.forEach(cat => {
        const entry = active[cat] || { day: '', period: '' };
        const link = `${location.origin}${location.pathname.replace('admin.html', 'index.html')}?c=${encodeURIComponent(cat)}`;

        const row = document.createElement('div');
        row.className = 'activation-row';
        row.innerHTML = `
            <span class="cat-label">${cat}</span>
            <select class="sel-day" data-cat="${cat}">
                <option value="">-- Jour --</option>
                ${cfg.days.map(d => `<option value="${d}" ${d === entry.day ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
            <select class="sel-period" data-cat="${cat}">
                <option value="">-- Période --</option>
                ${cfg.periods.map(p => `<option value="${p}" ${p === entry.period ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
            <button class="btn btn-small" data-cat="${cat}">Activer</button>
            <button class="btn-link" data-cat="${cat}" title="Copier le lien">&#128279; Copier lien</button>
            ${entry.day ? `<span class="active-tag">&#9679; ${entry.day} (${entry.period})</span>` : '<span class="inactive-tag">inactif</span>'}
        `;
        panel.appendChild(row);

        row.querySelector('.btn-small').addEventListener('click', () => {
            const selDay = row.querySelector('.sel-day').value;
            const selPeriod = row.querySelector('.sel-period').value;
            if (!selDay || !selPeriod) { toast('Sélectionne jour + période'); return; }
            const act = loadActive();
            act[cat] = { day: selDay, period: selPeriod };
            saveActive(act);
            refreshAll();
            toast(`${cat} activé !`);
        });

        row.querySelector('.btn-link').addEventListener('click', () => {
            navigator.clipboard.writeText(link).then(() => toast('Lien copié !'));
        });
    });
}

function renderMenusGrid(cfg, data) {
    const grid = document.getElementById('menus-grid');
    const active = loadActive();
    const activeKeys = new Set();
    for (const [cat, entry] of Object.entries(active)) {
        if (entry.day && entry.period) activeKeys.add(makeKey(cat, entry.day, entry.period));
    }
    grid.innerHTML = '';

    cfg.categories.forEach(cat => {
        cfg.days.forEach(day => {
            cfg.periods.forEach(period => {
                const key = makeKey(cat, day, period);
                const isActive = activeKeys.has(key);

                const card = document.createElement('div');
                card.className = 'menu-card' + (isActive ? ' active' : '');
                card.innerHTML = `
                    <h3>${cat} — ${day} (${period})${isActive ? ' &#9679;' : ''}</h3>
                    <textarea data-key="${key}" placeholder="Entrée,Plat,Dessert&#10;Salade,Steak,Tarte&#10;...">${data[key] || ''}</textarea>
                `;
                grid.appendChild(card);
            });
        });
    });

    document.querySelectorAll('#menus-grid textarea').forEach(ta => {
        let timer;
        ta.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                const allData = loadMenuData();
                allData[ta.dataset.key] = ta.value;
                saveMenuData(allData);
                toast('Menu sauvegardé');
            }, 500);
        });
    });
}

function refreshAll() {
    const cfg = loadConfig();
    const data = loadMenuData();

    renderTagList('categories-list', cfg.categories, item => {
        const act = loadActive();
        cfg.categories = cfg.categories.filter(c => c !== item);
        delete act[item];
        saveActive(act);
        saveConfig(cfg);
        refreshAll();
    });
    renderTagList('days-list', cfg.days, item => {
        cfg.days = cfg.days.filter(d => d !== item);
        saveConfig(cfg);
        refreshAll();
    });
    renderTagList('periods-list', cfg.periods, item => {
        cfg.periods = cfg.periods.filter(p => p !== item);
        saveConfig(cfg);
        refreshAll();
    });

    renderActivationPanel(cfg);
    renderMenusGrid(cfg, data);
}

function addItem(inputId, listKey, label) {
    const input = document.getElementById(inputId);
    const value = input.value.trim();
    if (!value) return;
    const cfg = loadConfig();
    if (cfg[listKey].includes(value)) { toast('Déjà présent'); return; }
    cfg[listKey].push(value);
    saveConfig(cfg);
    input.value = '';
    refreshAll();
    toast(`${label} ajouté`);
}

function seedTestData(force) {
    const data = loadMenuData();
    if (Object.keys(data).length > 0 && !force) return;

    const menus = {};
    const cats = DEFAULTS.categories;
    const days = DEFAULTS.days;
    const periods = DEFAULTS.periods;

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

    cats.forEach(cat => {
        const slugCat = slugify(cat);
        const catSamples = samples[slugCat] || samples['vip'];
        days.forEach((day, di) => {
            periods.forEach(period => {
                const key = makeKey(cat, day, period);
                menus[key] = catSamples[di % catSamples.length];
            });
        });
    });

    saveMenuData(menus);

    const active = {};
    active[cats[0]] = { day: days[0], period: periods[0] };
    if (cats[1]) active[cats[1]] = { day: days[0], period: periods[0] };
    saveActive(active);
}

function init() {
    if (!localStorage.getItem('menu_config')) saveConfig({ ...DEFAULTS });
    seedTestData();
    refreshAll();
    document.getElementById('add-category').addEventListener('click', () => addItem('new-category', 'categories', 'Catégorie'));
    document.getElementById('add-day').addEventListener('click', () => addItem('new-day', 'days', 'Jour'));
    document.getElementById('add-period').addEventListener('click', () => addItem('new-period', 'periods', 'Période'));
    document.getElementById('new-category').addEventListener('keydown', e => { if (e.key === 'Enter') addItem('new-category', 'categories', 'Catégorie'); });
    document.getElementById('new-day').addEventListener('keydown', e => { if (e.key === 'Enter') addItem('new-day', 'days', 'Jour'); });
    document.getElementById('new-period').addEventListener('keydown', e => { if (e.key === 'Enter') addItem('new-period', 'periods', 'Période'); });
    document.getElementById('seed-test').addEventListener('click', () => { seedTestData(true); refreshAll(); toast('Données test chargées !'); });
}

init();
