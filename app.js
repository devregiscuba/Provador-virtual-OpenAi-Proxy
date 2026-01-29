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

//Gerar imagem combinadas
app.post('/generation-image', upload.array('image', 2), async (req, res) => {
    try {
        const { prompt, typeproduct } = req.body;

        if (!prompt || !typeproduct) {
            return res.status(400).json({
                error: 'prompt e typeproduct são obrigatórios'
            });
        }

        if (!req.files || req.files.length !== 2) {
            return res.status(400).json({ error: 'Envie exatamente 2 imagens' });
        }

        console.log('typeproduct', typeproduct);
        console.log('prompt', prompt);

        const formData = new FormData();

        formData.append('model', 'gpt-image-1');//afeta
        formData.append('quality', 'medium');//afeta
        formData.append('prompt', prompt);
        formData.append('size', '1024x1536');//afeta
        formData.append('n', '1');//afeta
        formData.append('output_format', 'png');//nao afeta

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


//Ler imagem
app.post('/read-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Envie uma imagem' });
        }
       
        const base64 = req.file.buffer.toString('base64');

        const payload = {
            model: 'gpt-4o-mini',
            temperature: 0,
            messages: [
                {
                    role: 'system',
                    content: 'extrai dados estruturados de imagens.'
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `
                                Leia a imagem e retorne APENAS JSON válido.
                                Formato obrigatório:
                                [
                                { "id": string, "quantity": number }
                                ]

                                Regras:
                                - NÃO use markdown
                                - NÃO inclua texto explicativo
                                - sempre sera id do produto e em seguida quantidade
                                - se nao houver quantity usar 1
                                - Ignore qualquer texto que não seja produto
`
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/png;base64,${base64}`
                            }
                        }
                    ]
                }
            ]
        };

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${OPENAI_API_KEY}`
                }
            }
        );

        if (!response.data?.choices?.[0]) {
            return res.status(500).json({
                error: 'Erro na resposta da OpenAI',
                data: response.data
            });
        }

        res.json({
            result: response.data.choices[0].message.content
        });

    } catch (err) {
        console.error(err.response?.data || err);
        res.status(500).json({
            error: 'Erro interno',
            details: err.response?.data || err.message
        });
    }
});


if (!process.env.VERCEL) {
  app.listen(8081, () => {
    console.log('Servidor rodando em http://localhost:8081');
  });
}
