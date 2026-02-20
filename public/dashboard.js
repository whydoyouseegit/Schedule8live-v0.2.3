const fileInput = document.getElementById('fileInput');
const statusDiv = document.getElementById('status');

document.getElementById('uploadBtn').addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return alert('Выберите файл');

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });

    const result = await response.json();
    statusDiv.textContent = result.success ? 'Файл загружен' : 'Ошибка';
});

document.getElementById('activateBtn').addEventListener('click', async () => {
    const response = await fetch('/api/activate', {
        method: 'POST'
    });

    const result = await response.json();
    statusDiv.textContent = result.success ? 'Расписание активировано' : 'Ошибка';
});