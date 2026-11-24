// Página de Análise: escolher o arquivo, conferir os checkboxes,
// enviar para a IA (ou usar o exame de exemplo) e mostrar o resultado.
//
// Importante (privacidade): nada aqui salva o exame. Ele fica só na memória
// da página enquanto ela está aberta, e some ao fechar ou recarregar.

// ---------- 1. Pegando os elementos da página ----------
// Guardamos cada parte da página numa constante para usar depois.

const formulario    = document.querySelector('.form-envio');
const inputArquivo  = document.querySelector('#arquivo');
const caixaUpload   = document.querySelector('.upload');       // o CSS destaca a área quando esta caixa tem a classe "arrastando"
const areaUpload    = document.querySelector('.upload-area');
const caixaEscolhido = document.querySelector('.upload-escolhido');
const previaFoto    = document.querySelector('.upload-previa');
const previaPdf     = document.querySelector('.upload-previa-pdf');
const nomeArquivo   = document.querySelector('.upload-nome');
const checkDados    = document.querySelector('#sem-dados');
const checkEntendi  = document.querySelector('#entendi');
const avisoForm     = document.querySelector('.form-aviso');
const botaoEnviar   = document.querySelector('.envio-botao');
const botaoExemplo  = document.querySelector('.btn-exemplo');

const estadoCarregando = document.querySelector('.estado-carregando');
const estadoErro    = document.querySelector('.estado-erro');
const erroTitulo    = document.querySelector('.erro-titulo');
const erroTexto     = document.querySelector('.erro-texto');

const resultado     = document.querySelector('#resultado');
const tituloResultado = document.querySelector('#titulo-resultado');
const etiquetaExemplo = document.querySelector('.resultado-etiqueta');
const caixaResumo   = document.querySelector('.resultado-resumo');
const listaItens    = document.querySelector('.itens');
const moldeItem     = document.querySelector('#molde-item');

// ---------- 2. Regras ----------

const TIPOS_ACEITOS = ['application/pdf', 'image/jpeg', 'image/png'];

// A Vercel não aceita envios maiores que ~4,5 MB. O arquivo vai "traduzido" em texto
// (base64), que fica ~33% maior. Por isso o PDF pode ter no máximo 3 MB.
// Fotos não têm esse problema: nós diminuímos a foto antes de enviar (veja prepararArquivo).
const LIMITE_PDF = 3 * 1024 * 1024;        // 3 MB
const LIMITE_FOTO = 20 * 1024 * 1024;      // 20 MB (antes de diminuir)
const LADO_MAXIMO_FOTO = 1600;             // em pixels; é o bastante para a IA ler o exame
const TEMPO_LIMITE = 45000;                // 45 segundos esperando a IA (ela costuma levar ~18s); depois disso, desiste

// Texto de cada selo. A cor e o ícone (✓ ou !) vêm do CSS.
const SELOS = {
  'normal':       { texto: 'Normal',          atencao: false },
  'pouco-acima':  { texto: 'Um pouco acima',  atencao: true },
  'acima':        { texto: 'Acima da referência', atencao: true },
  'pouco-abaixo': { texto: 'Um pouco abaixo', atencao: true },
  'abaixo':       { texto: 'Abaixo da referência', atencao: true }
};

// O arquivo que a pessoa escolheu (começa vazio: null = "nada")
let arquivoEscolhido = null;

// ---------- 3. Escolher o arquivo (clicando ou arrastando) ----------

// Quando a pessoa escolhe um arquivo pelo botão
inputArquivo.addEventListener('change', function () {
  escolherArquivo(inputArquivo.files[0]);
});

// Arrastar e soltar: enquanto o arquivo passa por cima da área, ela fica destacada.
// O preventDefault() impede o navegador de simplesmente abrir o arquivo numa aba nova.
areaUpload.addEventListener('dragover', function (evento) {
  evento.preventDefault();
  caixaUpload.classList.add('arrastando');
});
areaUpload.addEventListener('dragleave', function (evento) {
  // Passar por cima do ícone ou do texto (que ficam DENTRO da área) não conta como sair
  if (areaUpload.contains(evento.relatedTarget)) return;
  caixaUpload.classList.remove('arrastando');
});
areaUpload.addEventListener('drop', function (evento) {
  evento.preventDefault();
  caixaUpload.classList.remove('arrastando');
  escolherArquivo(evento.dataTransfer.files[0]);
});

// Confere o arquivo e, se estiver tudo certo, guarda e mostra a prévia com o nome dele
function escolherArquivo(arquivo) {
  esconderMensagens();
  if (!arquivo) return;

  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    limparArquivo();
    mostrarAvisoForm('Esse tipo de arquivo não funciona. Escolha um PDF ou uma foto (JPG ou PNG).');
    return;
  }
  if (arquivo.type === 'application/pdf' && arquivo.size > LIMITE_PDF) {
    limparArquivo();
    mostrarAvisoForm('Esse PDF é grande demais (máximo 3 MB). Tente tirar uma foto do exame no lugar.');
    return;
  }
  if (arquivo.size > LIMITE_FOTO) {
    limparArquivo();
    mostrarAvisoForm('Essa foto é grande demais. Tente outra foto do exame.');
    return;
  }

  arquivoEscolhido = arquivo;
  mostrarPrevia(arquivo);
}

// Mostra o que a pessoa escolheu, para ela ter certeza de que é o arquivo certo.
// Foto: a própria imagem aparece. PDF: aparece um ícone de documento (o navegador não desenha PDF numa <img>).
function mostrarPrevia(arquivo) {
  apagarPrevia();
  const ehFoto = arquivo.type !== 'application/pdf';

  if (ehFoto) {
    // createObjectURL cria um endereço temporário que aponta para o arquivo NO COMPUTADOR da pessoa.
    // Nada é enviado para a internet nessa hora.
    previaFoto.src = URL.createObjectURL(arquivo);
  }
  // toggleAttribute liga/desliga o atributo "hidden". (Usamos ele porque o ícone é um <svg>,
  // e no <svg> escrever ".hidden = true" não funciona como numa <img>.)
  previaFoto.toggleAttribute('hidden', !ehFoto);
  previaPdf.toggleAttribute('hidden', ehFoto);

  nomeArquivo.textContent = arquivo.name;
  caixaEscolhido.hidden = false;
}

// Libera da memória a foto da prévia anterior (se tiver)
function apagarPrevia() {
  if (previaFoto.src) {
    URL.revokeObjectURL(previaFoto.src);
    previaFoto.removeAttribute('src');
  }
}

function limparArquivo() {
  arquivoEscolhido = null;
  inputArquivo.value = '';
  apagarPrevia();
  caixaEscolhido.hidden = true;
}

// Botão "Remover arquivo" da prévia
document.querySelector('.upload-remover').addEventListener('click', function () {
  limparArquivo();
  esconderMensagens();
  inputArquivo.focus();
});

// ---------- 4. Enviar o exame ----------

formulario.addEventListener('submit', function (evento) {
  evento.preventDefault(); // não deixa a página recarregar
  enviarExame();
});

// Botões da mensagem de erro
document.querySelector('.erro-tentar').addEventListener('click', enviarExame);
document.querySelector('.erro-exemplo').addEventListener('click', mostrarExemplo);

// O exemplo funciona sem os checkboxes: é fictício e não envia nada para a internet
botaoExemplo.addEventListener('click', mostrarExemplo);

// "async" deixa a função esperar (com "await") coisas que demoram, como a resposta da IA,
// sem travar a página enquanto isso.
async function enviarExame() {
  esconderMensagens();

  // Confere, na ordem da tela, se falta alguma coisa
  if (!arquivoEscolhido) {
    mostrarAvisoForm('Escolha a foto ou o PDF do exame antes de analisar.');
    areaUpload.scrollIntoView({ block: 'center' });
    return;
  }
  if (!checkDados.checked || !checkEntendi.checked) {
    mostrarAvisoForm('Marque as duas caixas de confirmação para continuar.');
    (checkDados.checked ? checkEntendi : checkDados).focus();
    return;
  }

  // Tudo certo: mostra "Analisando…" e trava o botão para não enviar duas vezes
  estadoCarregando.hidden = false;
  botaoEnviar.disabled = true;

  // try/catch: "tenta" fazer tudo; se qualquer passo der erro, pula para o catch
  try {
    const arquivo = await prepararArquivo(arquivoEscolhido);
    const dados = await pedirAnaliseParaIA(arquivo);
    mostrarResultado(dados, false);
  } catch (erro) {
    mostrarErro(erro.message);
  } finally {
    // "finally" roda sempre, dando certo ou errado
    estadoCarregando.hidden = true;
    botaoEnviar.disabled = false;
  }
}

// Transforma o arquivo em texto (base64) para poder mandar pela internet.
// Se for foto, antes diminui o tamanho dela.
async function prepararArquivo(arquivo) {
  if (arquivo.type === 'application/pdf') {
    const texto = await lerComoTexto(arquivo);
    return { tipo: 'application/pdf', dados: texto };
  }
  const texto = await diminuirFoto(arquivo);
  return { tipo: 'image/jpeg', dados: texto };
}

// Lê o arquivo e devolve só a parte em base64
// (o navegador devolve "data:application/pdf;base64,AAAA..."; ficamos com o que vem depois da vírgula)
function lerComoTexto(arquivo) {
  return new Promise(function (resolver, falhar) {
    const leitor = new FileReader();
    leitor.onload = function () { resolver(leitor.result.split(',')[1]); };
    leitor.onerror = function () { falhar(new Error('leitura')); };
    leitor.readAsDataURL(arquivo);
  });
}

// Desenha a foto num "quadro" (canvas) menor e salva de novo como JPG.
// Uma foto de celular de 5 MB costuma virar uns 300 KB, e a IA continua lendo bem.
function diminuirFoto(arquivo) {
  return new Promise(function (resolver, falhar) {
    const imagem = new Image();
    const endereco = URL.createObjectURL(arquivo);

    imagem.onload = function () {
      // Calcula o novo tamanho, mantendo a proporção
      const escala = Math.min(1, LADO_MAXIMO_FOTO / Math.max(imagem.width, imagem.height));
      const largura = Math.round(imagem.width * escala);
      const altura = Math.round(imagem.height * escala);

      const quadro = document.createElement('canvas');
      quadro.width = largura;
      quadro.height = altura;
      const pincel = quadro.getContext('2d');
      pincel.fillStyle = '#fff'; // fundo branco (PNG com fundo transparente ficaria preto no JPG)
      pincel.fillRect(0, 0, largura, altura);
      pincel.drawImage(imagem, 0, 0, largura, altura);

      URL.revokeObjectURL(endereco); // libera a memória
      resolver(quadro.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    imagem.onerror = function () {
      URL.revokeObjectURL(endereco);
      falhar(new Error('leitura'));
    };
    imagem.src = endereco;
  });
}

// Manda o arquivo para a nossa função na Vercel (api/analisar.js), que fala com a IA.
// Se passar de TEMPO_LIMITE, desiste (o AbortController é o "botão de cancelar" do fetch).
async function pedirAnaliseParaIA(arquivo) {
  const cancelar = new AbortController();
  const relogio = setTimeout(function () { cancelar.abort(); }, TEMPO_LIMITE);

  let resposta;
  try {
    resposta = await fetch('/api/analisar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(arquivo),
      signal: cancelar.signal
    });
  } finally {
    clearTimeout(relogio);
  }

  // A resposta vem em JSON. Se nem isso vier, algo deu errado no caminho.
  let dados;
  try {
    dados = await resposta.json();
  } catch (e) {
    throw new Error('servidor');
  }

  // A função pode avisar um problema conhecido (ex.: "nao-hemograma")
  if (dados.erro) throw new Error(dados.erro);
  if (!resposta.ok || !resultadoValido(dados)) throw new Error('servidor');
  return dados;
}

// Confere se a resposta tem o formato esperado, para não mostrar uma página quebrada
function resultadoValido(dados) {
  return Array.isArray(dados.resumo) &&
         Array.isArray(dados.itens) &&
         dados.itens.length > 0;
}

// ---------- 5. Mostrar o resultado ----------

function mostrarExemplo() {
  esconderMensagens();
  mostrarResultado(EXAME_EXEMPLO, true);
}

// Monta o resultado a partir dos dados (da IA ou do exemplo).
// SEGURANÇA: usamos sempre textContent (texto puro), nunca innerHTML.
// Assim, mesmo que a IA devolva algo estranho, aquilo aparece como texto e nunca vira código na página.
function mostrarResultado(dados, ehExemplo) {
  // Resumo: um <p> para cada parágrafo
  caixaResumo.replaceChildren(); // apaga o resumo anterior
  dados.resumo.forEach(function (paragrafo) {
    const p = document.createElement('p');
    p.textContent = paragrafo;
    caixaResumo.appendChild(p);
  });

  // Itens: copia o molde (<template>) e preenche
  listaItens.replaceChildren();
  dados.itens.forEach(function (item) {
    const copia = moldeItem.content.cloneNode(true); // cópia do molde
    const li = copia.querySelector('.item');
    const selo = copia.querySelector('.selo');
    const infoSelo = SELOS[item.situacao];

    copia.querySelector('.item-nome').textContent = item.nome;
    copia.querySelector('.item-valor strong').textContent = item.valor;
    copia.querySelector('.item-valor span').textContent =
      item.referencia ? 'Referência: ' + item.referencia : '';
    copia.querySelector('.item-explicacao').textContent = item.explicacao;

    if (infoSelo) {
      selo.textContent = infoSelo.texto;
      selo.classList.add(infoSelo.atencao ? 'selo-atencao' : 'selo-normal');
      if (infoSelo.atencao) li.classList.add('item-atencao');
    } else {
      selo.remove(); // situação desconhecida: melhor sem selo do que com um selo errado
    }

    listaItens.appendChild(copia);
  });

  etiquetaExemplo.hidden = !ehExemplo;
  resultado.hidden = false;

  // Leva a pessoa até o resultado e coloca o foco no título
  // (quem usa leitor de tela ouve "Resultado" e sabe que chegou)
  tituloResultado.focus({ preventScroll: true });
  resultado.scrollIntoView({ behavior: movimentoReduzido() ? 'auto' : 'smooth' });
}

// "Analisar outro exame": esconde o resultado, limpa o arquivo e volta para o envio
document.querySelector('.resultado-outro').addEventListener('click', function () {
  resultado.hidden = true;
  limparArquivo();
  esconderMensagens();
  document.querySelector('#envio').scrollIntoView({ behavior: movimentoReduzido() ? 'auto' : 'smooth' });
  inputArquivo.focus({ preventScroll: true });
});

// ---------- 6. Mensagens ----------

function mostrarAvisoForm(texto) {
  avisoForm.textContent = texto;
  avisoForm.hidden = false;
}

// Mostra a caixa de erro com um texto diferente para cada problema.
// Em todos os casos ela oferece o exame de exemplo.
function mostrarErro(codigo) {
  if (codigo === 'nao-hemograma') {
    erroTitulo.textContent = 'Não encontramos um hemograma nesse arquivo.';
    erroTexto.textContent = 'Confira se a foto está nítida e mostra os valores do exame. O ExamIA só explica hemogramas.';
  } else if (codigo === 'leitura') {
    erroTitulo.textContent = 'Não conseguimos abrir esse arquivo.';
    erroTexto.textContent = 'Tente escolher o arquivo de novo, ou tire outra foto do exame.';
  } else {
    erroTitulo.textContent = 'Não conseguimos analisar agora.';
    erroTexto.textContent = 'Pode ser a internet ou o serviço de IA. Você pode tentar de novo ou ver como funciona com o exame de exemplo.';
  }
  estadoErro.hidden = false;
  estadoErro.scrollIntoView({ block: 'center', behavior: movimentoReduzido() ? 'auto' : 'smooth' });
}

function esconderMensagens() {
  avisoForm.hidden = true;
  estadoErro.hidden = true;
}

// Quando a pessoa marca o checkbox que faltava, a mensagem some
function esconderAvisoForm() { avisoForm.hidden = true; }
checkDados.addEventListener('change', esconderAvisoForm);
checkEntendi.addEventListener('change', esconderAvisoForm);

function movimentoReduzido() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
