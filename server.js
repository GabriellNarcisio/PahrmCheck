const express = require("express");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Rota para buscar as farmácias (sem alterações)
app.get("/farmacias-proximas", (req, res) => {
  const { name, filtro } = req.query;
  let farmacias = [
    { nome: "Drogaria São Pedro", lat: -5.663087368462283, lng: -36.60160458638646, status: "aberta" },
    { nome: "Unifarma São Pedro", lat: -5.661974119301485, lng: -36.60239850821998, status: "aberta" },
    { nome: "Farmácia Menor Preço", lat: -5.663069412847678, lng: -36.601965459947145, status: "aberta" },
    { nome: "Drogaria Angicana", lat: -5.668121368622932, lng: -36.60601596921049, status: "aberta" },
    { nome: "Drogaria Efegê", lat: -5.663252919231281, lng: -36.600930501349524, status: "fechada" },
    { nome: "Farmácia do Trabalhador Angicano", lat: -5.662633683691763, lng: -36.600844670668316, status: "aberta" },
    { nome: "UniFarma", lat: -5.6632102133533, lng: -36.60196046952388, status: "aberta" },
    { nome: "Uni Farma São José", lat: -5.664000271584771, lng: -36.60020094055934, status: "aberta" }
  ];
  if (name && name.trim() !== '') {
    farmacias = farmacias.filter(f => f.nome.toLowerCase().includes(name.toLowerCase()));
  }
  if (filtro === "abertas") {
    farmacias = farmacias.filter(f => f.status === 'aberta');
  }
  res.json(farmacias);
});

// Rota para traçar a rota
app.post("/trace-route", async (req, res) => {
  const { start, end } = req.body;
  if (!start || !end) {
    return res.status(400).json({ error: "Coordenadas de início e fim são necessárias." });
  }
  try {
    const response = await axios.get('https://api.openrouteservice.org/v2/directions/driving-car', {
      params: {
        api_key: process.env.ORS_API_KEY,
        start: `${start.lng},${start.lat}`,
        end: `${end.lng},${end.lat}`
      }
    });

    const features = response.data.features;
    if (!features || features.length === 0) {
      return res.status(404).json({ error: "Nenhuma rota foi encontrada entre os pontos." });
    }

    const feature = features[0];
    
    // ✅ AQUI ESTÁ A CORREÇÃO: Verificamos o caminho correto para o 'summary'
    if (!feature.geometry || !feature.geometry.coordinates || !feature.properties || !feature.properties.summary) {
      console.log("--- RESPOSTA INCOMPLETA DA API DE ROTAS ---");
      console.log(JSON.stringify(response.data, null, 2));
      console.log("------------------------------------------");
      return res.status(500).json({ error: "A API de rotas retornou dados inválidos ou incompletos." });
    }
    
    const coordinates = feature.geometry.coordinates;
    // ✅ E AQUI: Pegamos o 'summary' do caminho correto
    const summary = feature.properties.summary;
    const leafletCoordinates = coordinates.map(coord => [coord[1], coord[0]]);

    res.json({
      coordinates: leafletCoordinates,
      summary: summary 
    });

  } catch (error) {
    // Melhoramos o log de erro para ser mais claro
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("Erro ao chamar a API de rotas do ORS:", errorMessage);
    res.status(500).json({ error: "O serviço de rotas falhou. Verifique o console do servidor." });
  }
});


// Rota para servir o arquivo HTML principal
app.get("/ver-farmacias", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages-user", "viewPharm-user.html"));
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});