// =========================================================================
// CONFIGURAÇÃO DO SEU SISTEMA DE VOTAÇÃO
// =========================================================================

// 1. URL do Webhook do Discord (para receber a apuração)
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1555278768430645349/sUzjZLMEaVNTz565smkz58e8Bv7FmDTcAJCzhZuFrK6ZsdjZJnAaG4eBpxg6_3Xib1yW";

// 2. Travar votos repetidos no mesmo navegador? (true = SIM, false = NÃO)
const IMPEDIR_VOTO_DUPLO = true;

// 3. Som de Fim de Votação (Áudio da Urna)
const somFim = new Audio("https://github.com/gamervermelho/site-urna/blob/main/urna.m4a");
const somBip = new Audio("https://raw.githubusercontent.com/gamervermelho/urna-eletronica/main/assets/tecla-acelerada.m4a");

// 4. ESTRUTURA DOS CARGOS E CANDIDATOS
const etapas = [
    {
        cargo: "GOVERNADOR",
        digitos: 2,
        candidatos: {
            "22": { nome: "Alex Santana Pinto", partido: "PARTIDO LIBERAL", foto: "https://via.placeholder.com/90x110?text=Gov+10" }

        }
    },
    {
        cargo: "PRESIDENTE",
        digitos: 2,
        candidatos: {
            "14": { nome: "Nico Gonçalves", partido: "PARTIDO MISSÃO", foto: "https://via.placeholder.com/90x110?text=Pres+15" },
            "22": { nome: "Agroteco", partido: "PARTIDO LIBERAL", foto: "https://via.placeholder.com/90x110?text=Pres+25" }
        }
    }
];

// =========================================================================
// LÓGICA INTERNA DA URNA
// =========================================================================

let etapaAtual = 0;
let numeroDigitado = "";
let votoBranco = false;
let votosRegistrados = [];

function tocarSomBip() {
    somBip.currentTime = 0;
    somBip.play().catch(() => {});
}

function tocarSomFim() {
    somFim.currentTime = 0;
    somFim.play().catch(() => {});
}

// Verifica se a pessoa já votou antes
function checarVotoDuplo() {
    if (IMPEDIR_VOTO_DUPLO && localStorage.getItem("ja_votou_urna") === "true") {
        document.getElementById("tela-fim").innerHTML = "<h1>VOCÊ JÁ VOTOU!</h1>";
        document.getElementById("tela-fim").style.display = "flex";
        return true;
    }
    return false;
}

// Atualizar a Tela conforme o cargo e dígitos
function atualizarTela() {
    if (checarVotoDuplo()) return;

    const etapa = etapas[etapaAtual];
    document.getElementById("cargo-nome").innerText = etapa.cargo;

    const box = document.getElementById("numeros-box");
    const dados = document.getElementById("dados-candidato");
    const foto = document.getElementById("foto-candidato");

    box.innerHTML = "";
    foto.innerHTML = "";
    dados.innerHTML = "";

    if (votoBranco) {
        dados.innerHTML = "<br><strong>VOTO EM BRANCO</strong>";
        return;
    }

    for (let i = 0; i < etapa.digitos; i++) {
        const char = numeroDigitado[i] || "";
        const pisca = (i === numeroDigitado.length) ? "pisca" : "";
        box.innerHTML += `<div class="quadrado-numero ${pisca}">${char}</div>`;
    }

    if (numeroDigitado.length === etapa.digitos) {
        if (etapa.candidatos[numeroDigitado]) {
            const cand = etapa.candidatos[numeroDigitado];
            dados.innerHTML = `Nome: <strong>${cand.nome}</strong><br>Partido: ${cand.partido}`;
            foto.innerHTML = `<img src="${cand.foto}" alt="Foto Candidato">`;
        } else {
            dados.innerHTML = "<br><strong>VOTO NULO</strong>";
        }
    }
}

function digitar(num) {
    const etapa = etapas[etapaAtual];
    if (votoBranco || numeroDigitado.length >= etapa.digitos) return;
    tocarSomBip();
    numeroDigitado += num;
    atualizarTela();
}

function votarBranco() {
    tocarSomBip();
    numeroDigitado = "";
    votoBranco = true;
    atualizarTela();
}

function corrige() {
    tocarSomBip();
    numeroDigitado = "";
    votoBranco = false;
    atualizarTela();
}

// Envia a apuração final para o Discord
function enviarVotosParaDiscord() {
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes("SUA_URL_DO_WEBHOOK_AQUI")) return;

    let mensagem = `🗳️ **NOVO VOTO COMPLETO REGISTRADO!**\n`;
    mensagem += `> **Data/Hora:** ${new Date().toLocaleString('pt-BR')}\n`;
    mensagem += `-----------------------------------\n`;

    votosRegistrados.forEach(v => {
        mensagem += `• **${v.cargo}:** ${v.voto}\n`;
    });

    fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: mensagem })
    }).catch(err => console.error("Erro ao enviar para o Discord:", err));
}

function confirma() {
    const etapa = etapas[etapaAtual];

    if (numeroDigitado.length === etapa.digitos || votoBranco) {
        tocarBip();

        let opcaoVoto = "NULO";
        let nomeCandidato = "VOTO NULO";
        let partido = "N/A";

        if (votoBranco) {
            opcaoVoto = "BRANCO";
            nomeCandidato = "VOTO EM BRANCO";
            partido = "N/A";
        } else if (etapa.candidatos[numeroDigitado]) {
            const cand = etapa.candidatos[numeroDigitado];
            opcaoVoto = numeroDigitado;
            nomeCandidato = cand.nome;
            partido = cand.partido;
        }

        // 1. Grava no banco de dados local / Firebase
        const bancoVotos = JSON.parse(localStorage.getItem("banco_votos") || "{}");
        if (!bancoVotos[etapa.cargo]) bancoVotos[etapa.cargo] = {};
        
        bancoVotos[etapa.cargo][opcaoVoto] = (bancoVotos[etapa.cargo][opcaoVoto] || 0) + MULTIPLICADOR_VOTOS;
        localStorage.setItem("banco_votos", JSON.stringify(bancoVotos));

        // 2. Dispara a notificação para o canal do Discord em tempo real
        enviarWebhookApuracao(usuarioDiscord, etapa.cargo, opcaoVoto, nomeCandidato, partido);

        etapaAtual++;
        numeroDigitado = "";
        votoBranco = false;

        if (etapaAtual < etapas.length) {
            atualizarTela();
        } else {
            somFim.play().catch(() => {});

            const eleitoresVotaram = JSON.parse(localStorage.getItem("eleitores_que_votaram") || "[]");
            eleitoresVotaram.push({
                id: usuarioDiscord.id,
                username: usuarioDiscord.username,
                data: new Date().toLocaleString('pt-BR')
            });
            localStorage.setItem("eleitores_que_votaram", JSON.stringify(eleitoresVotaram));

            document.getElementById("fim-data-hora").innerText = obterDataHoraBrasilia();
            document.getElementById("tela-fim").classList.remove("hidden");
            document.getElementById("tela-fim").classList.add("flex");
        }
    }
}

atualizarTela();