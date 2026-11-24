// Menu do celular: abre e fecha a lista de links quando o botão de três linhas é tocado.
// A animação (três linhas virando "X") está toda no CSS; aqui só trocamos o estado.

const botaoMenu = document.querySelector('.menu-botao');
const linksMenu = document.querySelectorAll('.menu-links a');

// Guarda no botão se o menu está aberto (true) ou fechado (false).
// O CSS olha esse atributo para mostrar a lista e desenhar o "X".
function mudarMenu(aberto) {
  botaoMenu.setAttribute('aria-expanded', aberto);
  botaoMenu.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
}

// Toque no botão: se estava fechado abre, se estava aberto fecha.
botaoMenu.addEventListener('click', function () {
  const estaAberto = botaoMenu.getAttribute('aria-expanded') === 'true';
  mudarMenu(!estaAberto);
});

// Toque em qualquer link do menu: fecha o menu (senão ele cobre a página).
linksMenu.forEach(function (link) {
  link.addEventListener('click', function () {
    mudarMenu(false);
  });
});

// Tecla Esc também fecha o menu (acessibilidade para quem usa teclado).
document.addEventListener('keydown', function (evento) {
  if (evento.key === 'Escape') {
    mudarMenu(false);
  }
});
