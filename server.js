import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, 'temp.xlsx');
    }
});

const upload = multer({ storage });

// загрузка нового файла
app.post('/api/upload', upload.single('file'), (req, res) => {
    res.json({ success: true });
});

// активация файла
app.post('/api/activate', (req, res) => {
    const tempPath = path.join('uploads', 'temp.xlsx');
    const currentPath = path.join('uploads', 'current.xlsx');

    if (!fs.existsSync(tempPath)) {
        return res.status(400).json({ error: 'Файл не загружен' });
    }

    fs.copyFileSync(tempPath, currentPath);
    res.json({ success: true });
});

// получение текущего расписания
app.get('/api/schedule', (req, res) => {
    const currentPath = path.join('uploads', 'current.xlsx');

    if (!fs.existsSync(currentPath)) {
        return res.status(404).json({ error: 'Расписание не найдено' });
    }

    res.sendFile(path.resolve(currentPath));
});

// 🔥 ОДИН listen
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

