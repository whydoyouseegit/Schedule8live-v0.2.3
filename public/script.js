(function() {
    const EXCEL_FILE = 'test.xlsx';
    const CLASSES = ['5а','5б','5в','9а','9б','9в','10а','10б','10в','11а','11б', '6а', '6б' , '7а', '7в' , '8а', '8б' , '8в', 'Иностранный язык' , 'Физическая культура', 'Музыка', 'Мероприятия'];
    let slideInterval = null;
    let currentSlide = 0;
    let workbookCache = null;
    let forcedSheet = null; // для ручного переключения смены

    // --- Вспомогательные функции ---
    function normalize(str) {
        return String(str || '').replace(/\s+/g,' ').replace(/\u00A0/g,' ').trim().toLowerCase();
    }

    function updateTime() {
        const timeElement = document.getElementById('currentTime');
        if(timeElement){
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
        }
    }
    setInterval(updateTime,1000);
    updateTime();

    // --- Основная загрузка ---
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

        } catch (error) {
            container.innerHTML = `
                <div class="loading-state">
                    <p style="color:red;">${error.message}</p>
                </div>
            `;
        }
    }

    // --- Авто-переключение смен ---
    function getCurrentSheets(){
        if(forcedSheet) return [forcedSheet]; // если принудительно сменили
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();

        if(hour < 13) return ['1 смена'];
        if(hour === 14 && minute < 10) return ['1 смена','2 смена'];
        return ['2 смена'];
    }

    function startAutoSwitch(){
        if(!workbookCache) return;
        const sheets = getCurrentSheets();
        if(slideInterval) clearInterval(slideInterval);
        currentSlide = 0;

        if(sheets.length===1){
            renderScheduleFromSheet(workbookCache.Sheets[sheets[0]]);
        } else if(sheets.length===2){
            renderScheduleFromSheet(workbookCache.Sheets[sheets[currentSlide]]);
            slideInterval = setInterval(()=>{
                currentSlide=(currentSlide+1)%2;
                renderScheduleFromSheet(workbookCache.Sheets[sheets[currentSlide]]);
            },20000);
        }
    }

    // --- Рендер расписания ---
    function renderScheduleFromSheet(sheet){
        const container = document.getElementById('content');
        const rows = XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
        let headerRow=-1;
        for(let i=0;i<rows.length;i++){
            const row = rows[i]||[];
            if(String(row[0]||'').includes('') && String(row[1]||'')==='Урок'){
                headerRow=i;
                break;
            }
        }
        if(headerRow===-1){
            container.innerHTML='<div class="loading-state"><p>Неверный формат файла</p></div>';
            return;
        }

        const headerCells = rows[headerRow]||[];
        const positions=[];
        CLASSES.forEach(className=>{
            const colIndex = headerCells.findIndex(cell => normalize(cell)===normalize(className));
            if(colIndex!==-1) positions.push({name:className,col:colIndex});
        });
        positions.sort((a,b)=>a.col-b.col);

        const schedule={};
        const dataStart=headerRow+2;

        positions.forEach(pos=>{
            const lessons=[];
            const timeCol=pos.col-1;
            const subjCol=pos.col;
            const teachCol=pos.col+1;
            const cabCol=pos.col+2;

            for(let row=dataStart;row<rows.length;row++){
                const currentRow = rows[row]||[];
                const time = currentRow[timeCol];
                if(!time || String(time).trim()==='') break;
                let subject=String(currentRow[subjCol]||'').trim();
                if(subject.includes('/')) subject=subject.split('/').map(s=>s.trim()).join(' / ');
                let teacher=String(currentRow[teachCol]||'').trim();
                let cabinet=String(currentRow[cabCol]||'').trim();
                if(!subject || subject==='-'||subject==='—'){subject='окно';teacher='';cabinet='';}
                teacher=teacher.replace(/[^\w\s\.,\-А-Яа-я]/g,'').trim();
                cabinet=cabinet.replace(/[^\w\d\s\-]/g,'').trim();
                lessons.push({time: String(time).replace(/\n/g,' ').trim(), subject, teacher, room:cabinet});
                if(lessons.length>=8) break;
            }

            if(lessons.length>0) schedule[pos.name]=lessons;
        });

        const html = positions.map(pos=>{
            const lessons=schedule[pos.name]||[];
            return `
                <div class="schedule-card">
                    <div class="card-header">${pos.name} <span class="class-badge"></span></div>
                    <div class="lessons-list">
                        ${lessons.map(lesson=>`
                            <div class="lesson-item ${!lesson.teacher&&!lesson.room&&lesson.subject==='окно'?'lesson-empty':''}">
                                <div class="lesson-time">${lesson.time}</div>
                                <div class="lesson-subject">${lesson.subject}</div>
                                ${(lesson.teacher||lesson.room)?`
                                    <div class="lesson-details">
                                        ${lesson.teacher?`<span class="lesson-teacher">${lesson.teacher}</span>`:''}
                                        ${lesson.room?`<span class="lesson-room">${lesson.room}</span>`:''}
                                    </div>`:''}
                            </div>`).join('')}
                        ${lessons.length===0?'<div class="lesson-item lesson-empty"><div class="lesson-subject">нет уроков</div></div>':''}
                    </div>
                </div>
            `;
        }).join('');
        container.innerHTML = html;
    }

    loadSchedule();

    // ===================
    // --- ДЕБАГ-МЕНЮ ---
    // ===================
    const debugMenu = document.createElement('div');
    debugMenu.style.cssText = `
        position: fixed; top: 10px; right: 10px; width: 280px;
        background: rgba(0,0,0,0.85); color: #fff; font-size: 14px;
        padding: 10px; border-radius: 10px; z-index: 9999;
        display: none; flex-direction: column; gap: 6px;
    `;
    debugMenu.innerHTML = `
        <strong>DEBUG MENU by oops</strong>
        <label>Файл Excel: <input type="text" id="debugFile" value="test.xlsx" style="width:100%"></label>
        <button id="debugLoad">Загрузить Excel</button>
        <button id="debugSheet1">1 смена</button>
        <button id="debugSheet2">2 смена</button>
        <button id="debugReset">Авто</button>
        <div id="debugInfo"></div>
    `;
    document.body.appendChild(debugMenu);

    // Показ / скрытие меню Ctrl+D
    document.addEventListener('keydown', e=>{
        if(e.key.toLowerCase()==='m'){
            debugMenu.style.display = debugMenu.style.display==='flex'?'none':'flex';
        }
    });

    document.getElementById('debugLoad').addEventListener('click',()=>{
        const fileName = document.getElementById('debugFile').value || 'test.xlsx';
        forcedSheet = null;
        loadSchedule(fileName);
    });
    document.getElementById('debugSheet1').addEventListener('click',()=>{
        forcedSheet='1 смена';
        startAutoSwitch();
    });
    document.getElementById('debugSheet2').addEventListener('click',()=>{
        forcedSheet='2 смена';
        startAutoSwitch();
    });
    document.getElementById('debugReset').addEventListener('click',()=>{
        forcedSheet=null;
        startAutoSwitch();
    });

    const dashBtn = document.createElement('button');
    dashBtn.textContent = 'Открыть Dashboard';
    dashBtn.onclick = () => window.open('/dashboard.html', '_blank');
    debugMenu.appendChild(dashBtn);


})();
