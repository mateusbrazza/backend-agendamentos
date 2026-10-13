const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta_padrao_trocar_no_render';

// Conexão PostgreSQL / Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    family: 4
});

// Middleware para proteger rotas do Admin
function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ mensagem: 'Acesso negado. Faça login primeiro.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ mensagem: 'Sessão expirada ou token inválido.' });
        req.user = user;
        next();
    });
}

// Rota inicial de teste
app.get('/', (req, res) => {
    res.send({ status: "API online e operante!" });
});

// 🟢 ROTA PUBLICA: Login de Administrador
app.post('/api/admin/login', async (req, res) => {
    const { usuario, senha } = req.body;
    try {
        const resultado = await pool.query('SELECT * FROM administradores WHERE usuario = $1 AND senha = $2', [usuario, senha]);
        
        if (resultado.rows.length === 0) {
            return res.status(401).json({ mensagem: 'Usuário ou senha incorretos.' });
        }

        const token = jwt.sign({ id: resultado.rows[0].id, usuario }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, mensagem: 'Login realizado com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensagem: 'Erro interno no servidor ao realizar login.' });
    }
});

// 🟢 ROTA PUBLICA: Buscar horários já ocupados em um determinado dia
app.get('/api/agendamentos/ocupados', async (req, res) => {
    const { data } = req.query;
    try {
        const resultado = await pool.query('SELECT horario FROM agendamentos WHERE data = $1 AND status != \'Cancelado\'', [data]);
        const ocupados = resultado.rows.map(r => r.horario);
        res.json(ocupados);
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensagem: 'Erro ao buscar horários ocupados.' });
    }
});

// 🟢 ROTA PUBLICA: Criar Agendamento (Com validações de campos e de dupla reserva)
app.post('/api/agendamentos', async (req, res) => {
    const { cliente, whats, email, servico, valor, data, horario } = req.body;

    if (!cliente || !whats || !email || !servico || !valor || !data || !horario) {
        return res.status(400).json({ mensagem: 'Todos os campos são obrigatórios.' });
    }

    try {
        // Verificar se o horário já está ocupado
        const cheque = await pool.query('SELECT id FROM agendamentos WHERE data = $1 AND horario = $2 AND status != \'Cancelado\'', [data, horario]);
        if (cheque.rows.length > 0) {
            return res.status(409).json({ mensagem: 'Este horário acabou de ser reservado. Por favor, escolha outro.' });
        }

        const query = `
            INSERT INTO agendamentos (cliente, whats, email, servico, valor, data, horario, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'Aguardando Pix') RETURNING *
        `;
        const valores = [cliente, whats, email, servico, valor, data, horario];
        const novo = await pool.query(query, valores);

        res.status(201).json({ mensagem: "Agendamento criado com sucesso!", agendamento: novo.rows[0] });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Erro de Unique Key do Postgres
            return res.status(409).json({ mensagem: 'Este horário já está reservado.' });
        }
        res.status(500).json({ mensagem: "Erro ao salvar no banco de dados." });
    }
});

// 🔒 ROTA PROTEGIDA: Listar Agendamentos (Apenas com Token de Admin)
app.get('/api/agendamentos', autenticarToken, async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM agendamentos ORDER BY id DESC');
        res.json(resultado.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensagem: "Erro ao carregar lista de agendamentos." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
