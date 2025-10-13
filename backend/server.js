// Importações existentes
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

// NOVAS importações para as APIs
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// --- CONFIGURAÇÃO DA CONEXÃO COM O BANCO DE DADOS ---
const pool = new Pool({
    connectionString: process.env.DB_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erro ao conectar ao banco de dados:', err.stack);
    }
    console.log('Conexão com o banco de dados estabelecida com sucesso');
    release();
});


// --- ROTAS DA APLICAÇÃO ---

// Rotas de Ementas (sem alterações)
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

// --- ROTA PARA ANÁLISE DE LINKS (FINALIZADA) ---
app.post('/api/analyze-links', async (req, res) => {
    const { links } = req.body;

    if (!links || !Array.isArray(links) || links.length === 0) {
        return res.status(400).json({ error: 'A lista de links é obrigatória.' });
    }
    
    console.log(`Recebida solicitação para analisar ${links.length} links.`);

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

    if (!GEMINI_API_KEY || !PERPLEXITY_API_KEY) {
        console.error("ERRO: Chaves de API do Gemini ou Perplexity não encontradas no arquivo .env do backend.");
        return res.status(500).json({ error: 'Configuração do servidor incompleta: chaves de API faltando.' });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
        const analysisPromises = links.map(async (link) => {
            let content = '';
            let status = 'Reprovado';
            let description = 'Não foi possível acessar ou analisar o conteúdo do link.';

            try {
                // ETAPA 1: Usar Perplexity para buscar e resumir o conteúdo do link
                const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

                console.log(`Buscando conteúdo para: ${link}`);
                
                const perplexityPayload = {
                    model: "sonar-pro", // ou "sonar-small-online"
                    messages: [
                        {
                            role: "system",
                            content: "Você é um assistente eficiente que analisa o conteúdo de URLs."
                        },
                        {
                            role: "user",
                            content: `Por favor, acesse e forneça um resumo conciso do conteúdo principal encontrado nesta URL: ${link}`
                        }
                    ]
                };

                const perplexityResponse = await axios.post(PERPLEXITY_API_URL, perplexityPayload, {
                    headers: { 'Authorization': `Bearer ${PERPLEXITY_API_KEY}` }
                });

                content = perplexityResponse.data.choices[0].message.content;

                // ETAPA 2: Usar Gemini para analisar o resumo obtido
                const geminiPrompt = `
                    Com base no seguinte resumo de uma página web, crie uma "descricao" clara e objetiva (máximo 2 frases) sobre o conteúdo da página. Além disso, avalie se o conteúdo é educativo e confiável para um estudante do ensino médio, definindo um "status".

                    RESUMO DO CONTEÚDO:
                    ---
                    ${content.substring(0, 4000)}
                    ---

                    Responda OBRIGATORIAMENTE em um formato JSON com as chaves "descricao" e "status". O status deve ser "Aprovado" se for confiável e educativo, ou "Reprovado" caso contrário.
                    Exemplo de saída: {"descricao": "O link leva a um artigo detalhado sobre a Revolução Francesa, cobrindo suas causas e consequências.", "status": "Aprovado"}
                `;

                const result = await geminiModel.generateContent(geminiPrompt);
                const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '');
                
                const parsedResult = JSON.parse(responseText);
                
                description = parsedResult.descricao || 'Descrição não gerada.';
                status = parsedResult.status || 'Reprovado';

            } catch (error) {
                console.error(`Falha ao processar o link ${link}:`, error.response ? error.response.data : error.message);
            }

            const displayText = `${link}\nDescrição: ${description}`;

            return { 
                link, 
                status, 
                descricao: description,
                displayText
            };
        });

        const analysisResults = await Promise.all(analysisPromises);
        
        console.log("Análise de links concluída com sucesso.");
        res.json({ analysis: analysisResults });

    } catch (error) {
        console.error('Erro geral no endpoint /api/analyze-links:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao analisar links.' });
    }
});


// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

