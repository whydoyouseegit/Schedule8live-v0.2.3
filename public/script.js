(function () {

    const CLASSES = [
        '5а','5б','5в','6а','6б',
        '7а','7в',
        '8а','8б','8в',
        '9а','9б','9в',
        '10а','10б','10в',
        '11а','11б',
        'Иностранный язык','Физическая культура','Музыка','Мероприятия'
    ];

    let slideInterval = null;
    let currentSlide = 0;
    let workbookCache = null;
    let forcedSheet = null;

    function normalize(str) {
        return String(str || '')
            .replace(/\s+/g, ' ')
            .replace(/\u00A0/g, ' ')
            .trim()
            .toLowerCase();
    }

    function updateTime() {
        const el = document.getElementById('currentTime');
        if (!el) return;
        const now = new Date();
        el.textContent = now.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    setInterval(updateTime, 1000);
    updateTime();

    async function loadSchedule() {

        const container = document.getElementById('content');

        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Загрузка расписания...</p>
            </div>
        `;

        try {
            const response = await fetch('/api/schedule');
            if (!response.ok) throw new Error('Расписание не найдено');

            const data = await response.arrayBuffer();
            workbookCache = XLSX.read(data, { type: 'array' });

            startAutoSwitch();

        } catch (err) {
            container.innerHTML = `
                <div class="loading-state">
                    <p style="color:red;">${err.message}</p>
                </div>
            `;
        }
    }

    function getCurrentSheets() {
        if (forcedSheet) return [forcedSheet];

        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();

        if (hour < 13) return ['1 смена'];
        if (hour === 14 && minute < 10) return ['1 смена', '2 смена'];
        return ['2 смена'];
    }

    function startAutoSwitch() {

        if (!workbookCache) return;

        const sheets = getCurrentSheets();

        if (slideInterval) clearInterval(slideInterval);

        currentSlide = 0;

        if (sheets.length === 1) {
            renderScheduleFromSheet(workbookCache.Sheets[sheets[0]]);
        } else {
            renderScheduleFromSheet(workbookCache.Sheets[sheets[currentSlide]]);
            slideInterval = setInterval(() => {
                currentSlide = (currentSlide + 1) % 2;
                renderScheduleFromSheet(workbookCache.Sheets[sheets[currentSlide]]);
            }, 20000);
        }
    }

    function renderScheduleFromSheet(sheet) {

        const container = document.getElementById('content');
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        let headerRow = -1;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i] || [];
            if (String(row[1] || '').trim() === 'Урок') {
                headerRow = i;
                break;
            }
        }

        if (headerRow === -1) {
            container.innerHTML = '<div class="loading-state"><p>Неверный формат файла</p></div>';
            return;
        }

        const headerCells = rows[headerRow] || [];
        const positions = [];

        CLASSES.forEach(className => {
            const colIndex = headerCells.findIndex(cell =>
                normalize(cell) === normalize(className)
            );
            if (colIndex !== -1) {
                positions.push({ name: className, col: colIndex });
            }
        });

        positions.sort((a, b) => a.col - b.col);

        const dataStart = headerRow + 2;

        const schedule = {};

        positions.forEach(pos => {

            const lessons = [];

            const timeCol = pos.col - 1;
            const subjCol = pos.col;
            const teachCol = pos.col + 1;
            const cabCol = pos.col + 2;

            for (let row = dataStart; row < rows.length; row++) {

                const currentRow = rows[row] || [];

                const rawTime = String(currentRow[timeCol] || '');
                const rawSubject = String(currentRow[subjCol] || '');
                const rawTeacher = String(currentRow[teachCol] || '');
                const rawCabinet = String(currentRow[cabCol] || '');

                // РЕНДЕРИМ ВСЁ
                let lessonNumber = 0;
                let timeText = rawTime.trim();

                const numberMatch = timeText.match(/^(\d+)\s*\n?/);

                if (numberMatch) {
                    lessonNumber = parseInt(numberMatch[1]);
                    timeText = timeText.replace(numberMatch[0], '').trim();
                }

                lessons.push({
                    number: lessonNumber,
                    time: timeText.replace(/\n/g, ' ').trim(),
                    subject: rawSubject.trim(),
                    teacher: rawTeacher.trim(),
                    room: rawCabinet.trim()
                });

                if (lessons.length >= 20) break;
            }

            schedule[pos.name] = lessons;
        });

        const html = positions.map(pos => {

            const lessons = schedule[pos.name] || [];

            return `
                <div class="schedule-card">
                    <div class="card-header">${pos.name}</div>
                    <div class="lessons-list">
                        ${lessons.map(lesson => `
                            <div class="lesson-item">
                                <div class="lesson-time">
                                    ${lesson.number > 0 ? `<span class="lesson-number">${lesson.number}</span>` : ''}
                                    ${lesson.time || ''}
                                </div>
                                <div class="lesson-subject">${lesson.subject || ''}</div>
                                <div class="lesson-details">
                                    ${lesson.teacher ? `<span class="lesson-teacher">${lesson.teacher}</span>` : ''}
                                    ${lesson.room ? `<span class="lesson-room">${lesson.room}</span>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    loadSchedule();

    // ===================
    // DEBUG MENU
    // ===================

    const debugMenu = document.createElement('div');
    debugMenu.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 280px;
        background: rgba(0,0,0,0.9);
        color: #fff;
        font-size: 14px;
        padding: 10px;
        border-radius: 10px;
        z-index: 9999;
        display: none;
        flex-direction: column;
        gap: 6px;
    `;

    debugMenu.innerHTML = `
        <strong>DEBUG MENU by oops</strong>
        <button id="debugSheet1">1 смена</button>
        <button id="debugSheet2">2 смена</button>
        <button id="debugReset">Авто</button>
        <button id="debugReload">Перезагрузить</button>
    `;

    document.body.appendChild(debugMenu);

    document.addEventListener('keydown', e => {
        if (e.key.toLowerCase() === 'm') {
            debugMenu.style.display =
                debugMenu.style.display === 'flex' ? 'none' : 'flex';
        }
    });

    document.getElementById('debugSheet1').onclick = () => {
        forcedSheet = '1 смена';
        startAutoSwitch();
    };

    document.getElementById('debugSheet2').onclick = () => {
        forcedSheet = '2 смена';
        startAutoSwitch();
    };

    document.getElementById('debugReset').onclick = () => {
        forcedSheet = null;
        startAutoSwitch();
    };

    document.getElementById('debugReload').onclick = () => {
        forcedSheet = null;
        loadSchedule();
    };

})();
