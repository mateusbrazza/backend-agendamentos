const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Permite que o seu front-end na Cloudflare comunique com este servidor

// Base de dados simulada em memória (depois podemos ligar a uma base de dados real como Supabase ou MongoDB)
let agendamentos = [];

// Rota de teste
app.get('/', (req, res) => {
    res.send({ status: "API de Agendamentos a funcionar 24h!" });
});

// Rota para listar agendamentos (usada no painel admin.html)
app.get('/api/agendamentos', (req, res) => {
    res.json(agendamentos);
});

// Rota para criar um novo agendamento (vindo de agendamento.html)
app.post('/api/agendamentos', (req, res) => {
    const novoAgendamento = {
        id: Date.now(),
        data: req.body.data,
        horario: req.body.horario,
        servico: req.body.servico,
        cliente: req.body.cliente,
        status: 'Pendente'
    };

    agendamentos.push(novoAgendamento);
    res.status(201).json({ mensagem: "Agendamento criado com sucesso!", agendamento: novoAgendamento });
});

// Porta do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});