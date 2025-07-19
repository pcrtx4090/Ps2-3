document.addEventListener('DOMContentLoaded', () => {

    // === KONFIGURASI & ELEMEN DOM ===
    const config = {
        urls: {
            ps2: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmT8IpH1gKP35mZuCqBEhqsw6HixfXzOTaMJEPK0mTJEGcxJhjpImqCg5HMqR4403AHovtyI_WX1cS/pub?output=csv',
            ps3: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQAsGtGZCfrc_6P39ywStqVIKm6Fqzp0V1wxoF4r5-iFbGwEpOsEvkJ7yoQlhi73QWKmDdZkDr-RUk1/pub?output=csv'
        },
        rowsPerPage: 50
    };

    const elements = {
        body: document.body,
        homeSection: document.getElementById('home-section'),
        gamesSection: document.getElementById('games-section'),
        gameGrid: document.getElementById('game-grid'),
        pagination: document.getElementById('pagination'),
        loader: document.getElementById('loader'),
        searchInput: document.getElementById('search-input'),
        consoleNav: document.querySelector('.console-nav'),
        modalOverlay: document.getElementById('modal-overlay'),
        modalContent: document.getElementById('modal-content'),
        modalCloseBtn: document.getElementById('modal-close-btn'),
        themeSwitcher: document.querySelector('.theme-switcher'),
        sortSelect: document.getElementById('sort-select'),
        regionSelect: document.getElementById('region-select'),
        resetFiltersBtn: document.getElementById('reset-filters-btn'),
    };

    // === STATE APLIKASI ===
    const state = {
        allGames: [],
        filteredGames: [],
        currentPage: 1,
        activeConsole: 'home',
        activeSort: 'alpha-asc',
        activeRegion: 'all',
        searchTerm: '',
    };
    
    // === FUNGSI-FUNGSI UTAMA ===

    function setTheme(themeName) {
        elements.body.dataset.theme = themeName;
        localStorage.setItem('selectedTheme', themeName);
        elements.themeSwitcher.querySelectorAll('.theme-dot').forEach(dot => {
            dot.classList.toggle('active', dot.dataset.theme === themeName);
        });
    }

    function showView(viewName) {
        elements.homeSection.classList.toggle('hidden', viewName !== 'home');
        elements.gamesSection.classList.toggle('hidden', viewName === 'home');
    }

    function parseInfoFromName(fileName) {
        const tagRegex = /\(([^)]+)\)/g;
        let tags = [];
        let match;
        while ((match = tagRegex.exec(fileName)) !== null) { tags.push(match[1]); }
        const title = fileName.replace(/\.zip$/i, '').replace(tagRegex, '').trim();
        return { title, tags };
    }

    function populateRegionFilter(games) {
        const regions = new Set();
        games.forEach(game => {
            const { tags } = parseInfoFromName(game['Nama File']);
            tags.forEach(tag => {
                if (['USA', 'Japan', 'Europe', 'World', 'Asia', 'Korea'].some(r => tag.includes(r))) {
                    regions.add(tag.split(/[\s,(]/)[0]);
                }
            });
        });
        
        elements.regionSelect.innerHTML = '<option value="all">Semua Region</option>';
        [...regions].sort().forEach(region => {
            const option = document.createElement('option');
            option.value = region.toLowerCase();
            option.textContent = region;
            elements.regionSelect.appendChild(option);
        });
    }

    function convertSizeToMB(sizeStr) {
        if (typeof sizeStr !== 'string') return 0;
        const size = parseFloat(sizeStr);
        if (sizeStr.includes('GiB')) return size * 1024;
        if (sizeStr.includes('MiB')) return size;
        return 0;
    }

    function applyFiltersAndSort() {
        let tempGames = [...state.allGames];

        if (state.searchTerm) {
            tempGames = tempGames.filter(game => game['Nama File'].toLowerCase().includes(state.searchTerm));
        }

        if (state.activeRegion !== 'all') {
            tempGames = tempGames.filter(game => game['Nama File'].toLowerCase().includes(`(${state.activeRegion}`));
        }

        tempGames.sort((a, b) => {
            switch (state.activeSort) {
                case 'alpha-desc': return b['Nama File'].localeCompare(a['Nama File']);
                case 'size-desc': return convertSizeToMB(b['Ukuran File']) - convertSizeToMB(a['Ukuran File']);
                case 'size-asc': return convertSizeToMB(a['Ukuran File']) - convertSizeToMB(b['Ukuran File']);
                default: return a['Nama File'].localeCompare(b['Nama File']);
            }
        });

        state.filteredGames = tempGames;
        renderPage(1);
    }

    async function loadConsoleData(consoleKey) {
        state.activeConsole = consoleKey;
        resetAllFilters(false);
        showView('games');
        
        elements.gameGrid.innerHTML = '';
        elements.pagination.innerHTML = '';
        elements.loader.innerHTML = `<div class="spinner"></div><p>Memuat data ${consoleKey.toUpperCase()}...</p>`;
        elements.loader.style.display = 'block';

        Papa.parse(config.urls[consoleKey], {
            download: true, header: true, skipEmptyLines: true,
            complete: (results) => {
                state.allGames = results.data.filter(g => g['Nama File'] && g['Nama File'] !== 'Parent directory/');
                populateRegionFilter(state.allGames);
                applyFiltersAndSort();
                elements.loader.style.display = 'none';
            },
            error: () => {
                elements.loader.innerHTML = '<p>Gagal memuat data. Periksa koneksi Anda.</p>';
            }
        });
    }

    function renderPage(page) {
        state.currentPage = page;
        elements.gameGrid.innerHTML = '';
        const startIndex = (page - 1) * config.rowsPerPage;
        const endIndex = startIndex + config.rowsPerPage;
        const pageItems = state.filteredGames.slice(startIndex, endIndex);

        if (pageItems.length === 0) {
            elements.gameGrid.innerHTML = `<p class="no-results">Tidak ada game yang cocok dengan filter Anda.</p>`;
            elements.pagination.innerHTML = '';
            return;
        }

        pageItems.forEach((game, index) => {
            const gameIndexInFiltered = startIndex + index;
            const { title, tags } = parseInfoFromName(game['Nama File']);
            const card = document.createElement('div');
            card.className = 'game-card glass-panel';
            card.dataset.filteredIndex = gameIndexInFiltered;
            
            const tagsHTML = tags.slice(0, 3).map(tag => `<span class="info-tag">${tag}</span>`).join('');
            card.innerHTML = `
                <div class="card-content">
                    <h3 class="game-title" title="${title}">${title}</h3>
                    <div class="tag-container">${tagsHTML}</div>
                    <div class="game-info">
                        <span class="game-size">${game['Ukuran File'] || 'N/A'}</span>
                        <div class="card-actions">
                            <button class="copy-btn action-btn"><i class="fas fa-copy"></i></button>
                            <a href="${game['Tautan Unduhan']}" class="download-btn action-btn" download><i class="fas fa-download"></i></a>
                        </div>
                    </div>
                </div>`;
            elements.gameGrid.appendChild(card);
        });

        renderPagination();
    }
    
    function openModal(filteredIndex) {
        const game = state.filteredGames[filteredIndex];
        const { title, tags } = parseInfoFromName(game['Nama File']);
        const tagsHTML = tags.map(tag => `<span class="info-tag">${tag}</span>`).join('');
        elements.modalContent.innerHTML = `
            <div class="modal-image-area"><i class="fas fa-image"></i><span>Cover Gambar</span></div>
            <div class="modal-details-area">
                <h2 class="modal-title">${title}</h2>
                <div class="tag-container">${tagsHTML || 'Tidak ada info tambahan'}</div>
                <div class="info-section"><strong>Ukuran File</strong><p>${game['Ukuran File'] || 'N/A'}</p></div>
                <div class="info-section"><strong>Nama File Lengkap</strong><p>${game['Nama File']}</p></div>
                <div class="modal-actions">
                    <button class="modal-action-btn copy"><i class="fas fa-copy"></i> Salin</button>
                    <a href="${game['Tautan Unduhan']}" class="modal-action-btn download" download><i class="fas fa-download"></i> Unduh</a>
                </div>
            </div>`;
        elements.modalOverlay.classList.add('active');
        elements.modalContent.querySelector('.copy').addEventListener('click', () => handleCopyClick(game['Tautan Unduhan'], elements.modalContent.querySelector('.copy')));
    }
    
    function closeModal() { elements.modalOverlay.classList.remove('active'); }

    function handleCopyClick(link, button) {
        navigator.clipboard.writeText(link).then(() => {
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
            button.classList.add('copied');
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('copied');
            }, 2000);
        });
    }
    
    function renderPagination() {
        elements.pagination.innerHTML = "";
        const pageCount = Math.ceil(state.filteredGames.length / config.rowsPerPage);
        if (pageCount <= 1) return;
        const container = document.createElement('div');
        container.className = 'page-controls glass-panel';
        const prevButton = createPageButton('<i class="fas fa-chevron-left"></i>', state.currentPage - 1);
        if (state.currentPage === 1) prevButton.disabled = true;
        container.appendChild(prevButton);
        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        pageInfo.textContent = `Halaman ${state.currentPage} dari ${pageCount}`;
        container.appendChild(pageInfo);
        const nextButton = createPageButton('<i class="fas fa-chevron-right"></i>', state.currentPage + 1);
        if (state.currentPage === pageCount) nextButton.disabled = true;
        container.appendChild(nextButton);
        elements.pagination.appendChild(container);
    }

    function createPageButton(innerhtml, page) {
        const button = document.createElement('button');
        button.className = 'page-btn';
        button.innerHTML = innerhtml;
        button.dataset.page = page;
        return button;
    }
    
    function resetAllFilters(apply = true) {
        state.activeSort = 'alpha-asc';
        state.activeRegion = 'all';
        state.searchTerm = '';
        elements.sortSelect.value = 'alpha-asc';
        elements.regionSelect.value = 'all';
        elements.searchInput.value = '';
        if (apply && state.activeConsole !== 'home') {
            applyFiltersAndSort();
        }
    }

    // === EVENT LISTENERS ===
    elements.consoleNav.addEventListener('click', (e) => {
        const button = e.target.closest('.console-btn');
        if (button) {
            const consoleKey = button.dataset.console;
            if (consoleKey !== state.activeConsole) {
                elements.consoleNav.querySelectorAll('.console-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                if (consoleKey === 'home') {
                    showView('home');
                    state.activeConsole = 'home';
                } else {
                    loadConsoleData(consoleKey);
                }
            }
        }
    });

    elements.themeSwitcher.addEventListener('click', (e) => {
        const dot = e.target.closest('.theme-dot');
        if (dot) setTheme(dot.dataset.theme);
    });

    elements.searchInput.addEventListener('input', (e) => {
        state.searchTerm = e.target.value.toLowerCase();
        applyFiltersAndSort();
    });

    elements.sortSelect.addEventListener('change', (e) => {
        state.activeSort = e.target.value;
        applyFiltersAndSort();
    });

    elements.regionSelect.addEventListener('change', (e) => {
        state.activeRegion = e.target.value;
        applyFiltersAndSort();
    });

    elements.resetFiltersBtn.addEventListener('click', () => resetAllFilters(true));

    elements.gameGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.game-card');
        const actionButton = e.target.closest('.action-btn');
        if (actionButton) {
            e.stopPropagation();
            if (actionButton.classList.contains('copy-btn')) {
                const game = state.filteredGames[card.dataset.filteredIndex];
                handleCopyClick(game['Tautan Unduhan'], actionButton);
            }
        } else if (card) {
            openModal(parseInt(card.dataset.filteredIndex, 10));
        }
    });

    elements.modalCloseBtn.addEventListener('click', closeModal);
    elements.modalOverlay.addEventListener('click', e => { if (e.target === elements.modalOverlay) closeModal(); });
    elements.pagination.addEventListener('click', e => {
        const button = e.target.closest('.page-btn');
        if (button && !button.disabled) renderPage(parseInt(button.dataset.page, 10));
    });

    // === INISIALISASI ===
    function init() {
        showView('home');
        const savedTheme = localStorage.getItem('selectedTheme') || 'dark';
        setTheme(savedTheme);
    }
    init();
});