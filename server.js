const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const GOOGLE_URL = 'https://script.google.com/macros/s/AKfycbyYzf2_AkOI9CDpozsUnU2dxlog5ZPsdEsmq2_CyCU6nebMBp4zzIcx_t7BkEbX3-d6/exec';

// Rota GET: Lista produtos, vendas, depoimentos
app.get('/api/get', async (req, res) => {
    try {
        const response = await axios.get(`${GOOGLE_URL}?acao=${req.query.acao}`);
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ status: "erro", log: err.message });
    }
});

// Rota POST: Registrar vendas e ações dinâmicas
app.post('/api/post', async (req, res) => {
    try {
        const response = await axios.post(GOOGLE_URL, req.body);
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ status: "erro", log: err.message });
    }
});

app.listen(3000, () => console.log('Servidor Cura Cuidado ativo em http://localhost:3000'));