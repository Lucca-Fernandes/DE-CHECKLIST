const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: 'http://localhost:5173' })); 
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DB_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.stack);
        return;
    }
    console.log('Conexão com o banco de dados estabelecida com sucesso');
    release();
});

// Rota para buscar todas as ementas
app.get('/api/ementas', async (req, res) => {
    try {
        const query = 'SELECT id, nome_disciplina, carga_horaria, objetivos, conteudo_programatico FROM ementa ORDER BY nome_disciplina';
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao consultar ementas:', err.stack);
        res.status(500).json({ error: 'Erro ao buscar ementas', details: err.message });
    }
});

// Rota para buscar ementa por ID
app.get('/api/ementas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'SELECT id, nome_disciplina, carga_horaria, objetivos, conteudo_programatico FROM ementa WHERE id = $1';
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ementa não encontrada' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao buscar ementa:', err.stack);
        res.status(500).json({ error: 'Erro ao buscar ementa', details: err.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});