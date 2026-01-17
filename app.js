const express = require('express');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');

require('dotenv').config();

const app = express();
app.use(cors());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const upload = multer({ storage: multer.memoryStorage() });

app.post('/generation-image', upload.array('image', 2), async (req, res) => {
    try {
        if (!req.files || req.files.length !== 2) {
            return res.status(400).json({ error: 'Envie exatamente 2 imagens' });
        }

        const formData = new FormData();

        formData.append('model', 'gpt-image-1-mini');
        formData.append(
            'prompt',
            'Combine a roupa da [Foto 1] na pessoa da [Foto 2]. Mantenha a textura, cor e estilo da peça da [Foto 1] exatamente como está. O ajuste deve ser natural no corpo da [Foto 2]. Use o mesmo fundo e iluminação da [Foto 1].'
        );
        //'Uma foto profissional de um cachorro usando coleira, em um estúdio com iluminação suave. O cachorro está totalmente visível, com texturas e cores realistas. O produto deve estar claramente visível e bem ajustado no cachorro. foco nítido, sem pessoas ou conteúdo inapropriado.'
        formData.append('size', '1024x1024');
        formData.append('n', '1');

        req.files.forEach(file => {
            formData.append('image[]', file.buffer, { filename: file.originalname });
        });

        const response = await axios.post('https://api.openai.com/v1/images/edits', formData, {
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                ...formData.getHeaders()
            }
        });

        res.json(response.data);

    } catch (err) {
        console.error(err.response?.data || err);
        res.status(500).json({ error: 'Erro interno', details: err.response?.data || err.message });
    }
});

app.listen(8081, () => console.log('Servidor rodando em http://localhost:8081'));
