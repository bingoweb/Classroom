(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ErrorLogsController = factory();
        root.ErrorLogsController.init();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    let currentLogs = [];
    let fetchToken = 0;
    let isCleanupPending = false;
    let initialized = false;

    const getApiUrl = () => {
        if (typeof CONFIG !== 'undefined' && CONFIG.API_URL) return CONFIG.API_URL;
        return '/api';
    };

    const getLogger = () => {
        if (typeof logger !== 'undefined') return logger;
        return { setDebugMode: () => {} };
    };

    const getUtils = () => {
        if (typeof Utils !== 'undefined') return Utils;
        return {
            showError: (msg) => alert(msg),
            showSuccess: (msg) => alert(msg),
            escapeHtml: (str) => {
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            }
        };
    };

    function getTimeSince(filterValue) {
        if (!filterValue) return null;
        const now = new Date();
        const past = new Date(now.getTime());
        if (filterValue === '1h') past.setHours(past.getHours() - 1);
        else if (filterValue === '24h') past.setHours(past.getHours() - 24);
        else if (filterValue === '7d') past.setDate(past.getDate() - 7);
        else if (filterValue === '30d') past.setDate(past.getDate() - 30);
        else return null;
        return past.toISOString();
    }

    async function refreshErrorLogs() {
        const listDiv = document.getElementById('errorLogsList');
        if (!listDiv) return;

        const level = document.getElementById('logLevelFilter') ? document.getElementById('logLevelFilter').value : '';
        const component = document.getElementById('logComponentFilter') ? document.getElementById('logComponentFilter').value : '';
        const timeFilter = document.getElementById('logTimeFilter') ? document.getElementById('logTimeFilter').value : '';

        const params = new URLSearchParams();
        if (level) params.append('level', level);
        if (component) params.append('component', component);
        
        const since = getTimeSince(timeFilter);
        if (since) params.append('since', since);

        fetchToken++;
        const currentToken = fetchToken;

        listDiv.textContent = 'Yükleniyor...';

        try {
            const qs = params.toString() ? `?${params.toString()}` : '';
            const response = await fetch(`${getApiUrl()}/logs${qs}`);
            
            if (currentToken !== fetchToken) return;

            if (!response.ok) {
                listDiv.textContent = 'Hata logları yüklenirken bir sorun oluştu.';
                return;
            }

            const data = await response.json();
            
            if (currentToken !== fetchToken) return;

            if (!Array.isArray(data)) {
                listDiv.textContent = 'Sunucudan geçersiz veri biçimi alındı.';
                return;
            }

            currentLogs = data;

            if (data.length === 0) {
                listDiv.textContent = 'Kayıt bulunamadı.';
                return;
            }

            listDiv.textContent = ''; // clear
            
            data.forEach(log => {
                const item = document.createElement('div');
                item.style.borderBottom = '1px solid #ccc';
                item.style.padding = '10px';
                item.style.marginBottom = '10px';

                const header = document.createElement('div');
                header.style.fontWeight = 'bold';
                header.style.marginBottom = '5px';
                
                let timeStr = 'Geçersiz Tarih';
                if (log.timestamp) {
                    const d = new Date(log.timestamp);
                    if (!isNaN(d.getTime())) {
                        timeStr = d.toLocaleString('tr-TR');
                    } else {
                        timeStr = log.timestamp;
                    }
                }

                header.textContent = `[${timeStr}] ${log.level || 'BİLİNMİYOR'} - ${log.component || 'BİLİNMİYOR'}`;
                item.appendChild(header);

                if (log.url) {
                    const urlDiv = document.createElement('div');
                    urlDiv.style.fontSize = '0.9em';
                    urlDiv.style.color = '#555';
                    urlDiv.textContent = `URL: ${log.url}`;
                    item.appendChild(urlDiv);
                }

                if (log.message) {
                    const msgDiv = document.createElement('div');
                    msgDiv.textContent = log.message;
                    item.appendChild(msgDiv);
                }

                const addPre = (label, dataStr) => {
                    if (dataStr === undefined || dataStr === null) return;
                    let displayStr = typeof dataStr === 'object' ? JSON.stringify(dataStr, null, 2) : String(dataStr);
                    if (!displayStr.trim() || displayStr === '{}') return;
                    
                    const container = document.createElement('div');
                    container.style.marginTop = '5px';
                    const lbl = document.createElement('div');
                    lbl.textContent = label + ':';
                    lbl.style.fontWeight = 'bold';
                    lbl.style.fontSize = '0.9em';
                    const pre = document.createElement('pre');
                    pre.style.background = '#f5f5f5';
                    pre.style.padding = '5px';
                    pre.style.borderRadius = '3px';
                    pre.style.fontSize = '0.85em';
                    pre.style.whiteSpace = 'pre-wrap';
                    pre.textContent = displayStr;
                    container.appendChild(lbl);
                    container.appendChild(pre);
                    item.appendChild(container);
                };

                addPre('Detaylar', log.error_details);
                addPre('Bağlam', log.context);
                addPre('Stack Trace', log.stack_trace);

                listDiv.appendChild(item);
            });

        } catch (err) {
            if (currentToken !== fetchToken) return;
            listDiv.textContent = 'Bağlantı hatası oluştu.';
        }
    }

    function filterErrorLogs() {
        refreshErrorLogs();
    }

    function exportErrorLogs() {
        if (!currentLogs || currentLogs.length === 0) {
            getUtils().showError('Dışa aktarılacak log bulunamadı.');
            return;
        }

        const jsonStr = JSON.stringify(currentLogs, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const filename = `hata-loglari-${yyyy}-${mm}-${dd}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function clearOldLogs() {
        if (isCleanupPending) return;
        
        if (typeof confirm !== 'undefined' && !confirm('30 günden eski logları silmek istediğinize emin misiniz?')) {
            return;
        }

        isCleanupPending = true;
        try {
            const response = await fetch(`${getApiUrl()}/logs/cleanup?days=30`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                getUtils().showError('Loglar temizlenirken bir hata oluştu.');
                isCleanupPending = false;
                return;
            }

            getUtils().showSuccess('Eski loglar başarıyla temizlendi.');
            refreshErrorLogs();
        } catch (e) {
            getUtils().showError('Loglar temizlenirken bağlantı hatası oluştu.');
        } finally {
            isCleanupPending = false;
        }
    }

    function toggleDebugMode() {
        const toggle = document.getElementById('debugModeToggle');
        if (!toggle) return;
        const enabled = toggle.checked;
        
        getLogger().setDebugMode(enabled);
        
        if (enabled) {
            getUtils().showSuccess('Debug modu açıldı.');
        } else {
            getUtils().showSuccess('Debug modu kapatıldı.');
        }
    }

    function init() {
        if (initialized) return;
        initialized = true;

        if (typeof window !== 'undefined') {
            window.refreshErrorLogs = refreshErrorLogs;
            window.filterErrorLogs = filterErrorLogs;
            window.exportErrorLogs = exportErrorLogs;
            window.clearOldLogs = clearOldLogs;
            window.toggleDebugMode = toggleDebugMode;

            const syncDebug = () => {
                const toggle = document.getElementById('debugModeToggle');
                if (toggle) {
                    const savedState = localStorage.getItem('slideshow_debug_mode');
                    if (savedState !== null) {
                        toggle.checked = savedState === 'true';
                    } else if (getLogger().isDebugEnabled) {
                        toggle.checked = getLogger().isDebugEnabled();
                    }
                }
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', syncDebug);
            } else {
                syncDebug();
            }
        }
    }

    return {
        init,
        refreshErrorLogs,
        filterErrorLogs,
        exportErrorLogs,
        clearOldLogs,
        toggleDebugMode,
        getTimeSince,
        _getCurrentLogs: () => currentLogs,
        _setFetchToken: (t) => { fetchToken = t; },
        _getFetchToken: () => fetchToken,
        _resetIsCleanupPending: () => { isCleanupPending = false; },
        _getIsCleanupPending: () => isCleanupPending,
        _setCurrentLogs: (l) => { currentLogs = l; }
    };
}));
