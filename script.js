// Lista de Candidatos (Você pode alterar ou adicionar novos aqui)
const candidatos = {
    "10": { nome: "Candidato Exemplo A", partido: "Partido Alfa", foto: "https://via.placeholder.com/90x110?text=Candidato+10" },
    "20": { nome: "Candidato Exemplo B", partido: "Partido Beta", foto: "https://via.placeholder.com/90x110?text=Candidato+20" }
};

let numeroDigitado = "";
let votoBranco = false;

// Sons Sintetizados (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function tocarSom(frequencia, duracao) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = frequencia;
    osc.start();
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duracao);
}

function tocarSomBip() { tocarSom(1200, 0.08); }
function tocarSomConfirma() {
    tocarSom(800, 0.15);
    setTimeout(() => tocarSom(1200, 0.5), 150);
}

// Lógica de Votação
function atualizarTela() {
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

    // Cria os 2 dígitos na tela
    for (let i = 0; i < 2; i++) {
        const char = numeroDigitado[i] || "";
        const pisca = (i === numeroDigitado.length) ? "pisca" : "";
        box.innerHTML += `<div class="quadrado-numero ${pisca}">${char}</div>`;
    }

    if (numeroDigitado.length === 2) {
        if (candidatos[numeroDigitado]) {
            const cand = candidatos[numeroDigitado];
            dados.innerHTML = `Nome: <strong>${cand.nome}</strong><br>Partido: ${cand.partido}`;
            foto.innerHTML = `<img src="${cand.foto}" alt="Foto Candidato">`;
        } else {
            dados.innerHTML = "<br><strong>VOTO NULO</strong>";
        }
    }
}

function digitar(num) {
    if (votoBranco || numeroDigitado.length >= 2) return;
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

function confirma() {
    if (numeroDigitado.length === 2 || votoBranco) {
        tocarSomConfirma();
        document.getElementById("tela-fim").style.display = "flex";
        
        setTimeout(() => {
            document.getElementById("tela-fim").style.display = "none";
            corrige();
        }, 3000);
    }
}

// Inicializa a tela
atualizarTela();