// Importações existentes
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

// Importações para as APIs
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
        console.error('Erro ao conectar ao banco de dados:', err.stack);
        return;
    }
    console.log('Conexão com o banco de dados estabelecida com sucesso');
    release();
});

// --- FUNÇÃO AUXILIAR PARA RETRY ---
const retry = async (fn, retries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === retries) throw error;
            console.warn(`Tentativa ${attempt} falhou, retrying após ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
};

// --- FUNÇÃO PARA EXTRAIR ID DO VÍDEO DO YOUTUBE ---
const getYouTubeVideoId = (url) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

// --- FUNÇÃO PARA LIMPAR URL ---
const cleanUrl = (url) => {
    return url.replace(/[.,;]$/, '').trim(); // Remove pontos ou outros caracteres finais
};

// --- FUNÇÃO PARA DETECTAR REDES SOCIAIS ---
const isSocialMediaLink = (url) => {
    const socialMediaDomains = [
        'tiktok.com', 
        'instagram.com', 
        'facebook.com', 
        'twitter.com', 
        'x.com'
    ];
    try {
        const urlObj = new URL(url);
        return socialMediaDomains.includes(urlObj.hostname.replace(/^www\./, ''));
    } catch (e) {
        return false; // URL inválida não é considerada rede social
    }
};

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

// --- ROTA PARA ANÁLISE DE LINKS ---
app.post('/api/analyze-links', async (req, res) => {
    const { links } = req.body;

    if (!links || !Array.isArray(links) || links.length === 0) {
        return res.status(400).json({ error: 'A lista de links é obrigatória.' });
    }
    
    console.log(`Recebida solicitação para analisar ${links.length} links.`);

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!GEMINI_API_KEY || !PERPLEXITY_API_KEY || !YOUTUBE_API_KEY) {
        console.error("ERRO: Chaves de API do Gemini, Perplexity ou YouTube não encontradas no arquivo .env do backend.");
        return res.status(500).json({ error: 'Configuração do servidor incompleta: chaves de API faltando.' });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
        const analysisPromises = links.map(async (link) => {
            link = cleanUrl(link); // Limpar URL antes de processar
            let content = '';
            let status = 'Reprovado';
            let description = 'Não foi possível acessar ou analisar o conteúdo do link.';

            try {
                // ETAPA 1: Detectar se é YouTube e usar YouTube Data API
                if (link.includes('youtube.com') || link.includes('youtu.be')) {
                    console.log(`Extraindo metadados do YouTube via API para: ${link}`);
                    const videoId = getYouTubeVideoId(link);
                    if (!videoId) {
                        throw new Error('ID do vídeo inválido ou não encontrado.');
                    }

                    const fetchYouTubeMetadata = async () => {
                        const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                            params: {
                                part: 'snippet',
                                id: videoId,
                                key: YOUTUBE_API_KEY
                            },
                            timeout: 10000
                        });

                        const video = response.data.items[0];
                        if (!video) {
                            throw new Error('Vídeo não encontrado na API do YouTube.');
                        }

                        const { title, description } = video.snippet;
                        return `Título: ${title}\nDescrição: ${description.substring(0, 500)}...`;
                    };

                    content = await retry(fetchYouTubeMetadata, 3, 1000);
                } else if (isSocialMediaLink(link)) {
                    // Detectar links de redes sociais
                    throw new Error('Conteúdo de rede social requer verificação manual.');
                } else {
                    // Para links não-YouTube, usar Perplexity
                    console.log(`Buscando conteúdo para (não-YouTube): ${link}`);
                    const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
                    
                    const perplexityPayload = {
                        model: "sonar-pro",
                        messages: [
                            {
                                role: "system",
                                content: "Você é um assistente que extrai e resume conteúdos de URLs de forma precisa e factual. NUNCA adicione informações não presentes na página, como ferramentas de IA ou resumos automáticos. Foque APENAS em título, descrição principal e resumo do conteúdo real."
                            },
                            {
                                role: "user",
                                content: `Acesse esta URL e forneça: 1) Título exato da página. 2) Descrição principal. 3) Resumo conciso (3-5 frases) do conteúdo principal, sem alucinações ou suposições. URL: ${link}`
                            }
                        ]
                    };

                    const perplexityResponse = await axios.post(PERPLEXITY_API_URL, perplexityPayload, {
                        headers: {
                            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                        },
                        timeout: 20000
                    });

                    content = perplexityResponse.data.choices[0].message.content;
                }

                // ETAPA 2: Usar Gemini apenas para gerar uma descrição curta
                const geminiPrompt = `
                    Com base no seguinte resumo de uma página web/vídeo, crie uma "descricao" clara e objetiva (máximo 2 frases) sobre o conteúdo real. NÃO avalie relevância ou adequação; apenas resuma o conteúdo.

                    RESUMO DO CONTEÚDO:
                    ---
                    ${content.substring(0, 4000)}
                    ---

                    Responda OBRIGATORIAMENTE em JSON com "descricao" e "status". O status deve ser "Pendente" para indicar que a relevância será avaliada posteriormente.
                    Exemplo: {"descricao": "Vídeo de Mario Sergio Cortella sobre excelência e comportamento profissional no trabalho.", "status": "Pendente"}
                `;

                const result = await geminiModel.generateContent(geminiPrompt);
                const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
                
                let parsedResult;
                try {
                    parsedResult = JSON.parse(responseText);
                } catch (parseErr) {
                    console.error(`Erro ao parsear JSON do Gemini para ${link}:`, parseErr);
                    parsedResult = { descricao: content, status: 'Reprovado' };
                }
                
                description = parsedResult.descricao || content;
                status = parsedResult.status || 'Reprovado';

            } catch (error) {
                console.error(`Falha ao processar o link ${link}:`, error.message, error.response ? `Status: ${error.response.status}` : '');
                description = error.message.includes('rede social') 
                    ? `Conteúdo de rede social requer verificação manual: ${link}`
                    : `Conteúdo inacessível após tentativas. Verifique manualmente o link: ${link}`;
                status = 'Reprovado';
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