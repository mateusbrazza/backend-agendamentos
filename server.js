const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

// Configuração da ligação ao Supabase (PostgreSQL) usando a variável de ambiente
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Criar a tabela automaticamente caso ela não exista ao iniciar o servidor
pool.query(`
    CREATE TABLE IF NOT EXISTS agendamentos (
        id SERIAL PRIMARY KEY,
        cliente TEXT,
        whats TEXT,
        email TEXT,
        servico TEXT,
        valor NUMERIC,
        data TEXT,
        horario TEXT,
        status TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`).catch(err => console.error("Erro ao criar tabela:", err));

// Rota de teste
app.get('/', (req, res) => {
    res.send({ status: "API ligada ao Supabase com sucesso!" });
});

// Listar agendamentos (para o admin.html)
app.get('/api/agendamentos', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM agendamentos ORDER BY id DESC');
        res.json(resultado.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensagem: "Erro ao buscar agendamentos" });
    }
});

// Criar agendamento (vindo do agendamento.html)
app.post('/api/agendamentos', async (req, res) => {
    const { cliente, whats, email, servico, valor, data, horario, status } = req.body;
    try {
        const query = `
            INSERT INTO agendamentos (cliente, whats, email, servico, valor, data, horario, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
        `;
        const valores = [cliente, whats, email, servico, valor, data, horario, status || 'Aguardando Pix'];
        const novo = await pool.query(query, valores);
        
        res.status(201).json({ mensagem: "Agendamento guardado na base de dados!", agendamento: novo.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensagem: "Erro ao salvar no banco de dados" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});
