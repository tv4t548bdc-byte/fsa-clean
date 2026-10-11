const SUPABASE_URL = "SUA_SUPABASE_URL_AQUI";
const SUPABASE_ANON_KEY = "SUA_SUPABASE_ANON_KEY_AQUI";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let orcamentoAtual = null;

async function carregarOrcamentos() {
  const { data, error } = await supabase
    .from('orcamentos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    alert("Erro ao carregar orçamentos");
    return;
  }

  const container = document.getElementById('lista-orcamentos');
  container.innerHTML = data.map(o => `
    <div class="card-orcamento">
      <h4>Ref: #ORC-${String(o.numero || o.id).padStart(4, '0')} - ${o.nome}</h4>
      <p><strong>Bairro:</strong> ${o.bairro} | <strong>Telefone:</strong> ${o.telefone}</p>
      <p><strong>Pets:</strong> ${o.tem_pets ? 'Sim' : 'Não'} | <strong>Manchas:</strong> ${o.tem_manchas ? 'Sim' : 'Não'}</p>
      <button onclick="abrirModal('${o.id}')" class="btn-secondary">Gerenciar</button>
    </div>
  `).join('');
}

async function abrirModal(id) {
  const { data } = await supabase.from('orcamentos').select('*').eq('id', id).single();
  orcamentoAtual = data;

  document.getElementById('modal-numero').innerText = `#ORC-${String(data.numero || data.id).padStart(4, '0')}`;
  document.getElementById('modal-valor').value = data.total || '';
  document.getElementById('modal-obs-pdf').value = data.observacao_pdf || '';

  document.getElementById('modal-detalhes').innerHTML = `
    <p><strong>Cliente:</strong> ${data.nome}</p>
    <p><strong>Telefone:</strong> ${data.telefone}</p>
    <p><strong>Última Limpeza:</strong> ${data.ultima_limpeza || 'Não informado'}</p>
    <p><strong>Possui Pets:</strong> ${data.tem_pets ? 'Sim' : 'Não'}</p>
    <p><strong>Possui Manchas:</strong> ${data.tem_manchas ? 'Sim' : 'Não'}</p>
    <div class="fotos-grid">
      ${(data.fotos || []).map(f => `<a href="${f}" target="_blank"><img src="${f}" width="80" /></a>`).join('')}
    </div>
  `;

  document.getElementById('modal-orcamento').classList.remove('hidden');
}

function fecharModal() {
  document.getElementById('modal-orcamento').classList.add('hidden');
}

async function salvarOrcamento() {
  const total = parseFloat(document.getElementById('modal-valor').value);
  const observacao_pdf = document.getElementById('modal-obs-pdf').value;

  await supabase.from('orcamentos').update({ total, observacao_pdf, status: 'orcado' }).eq('id', orcamentoAtual.id);
  alert("Orçamento salvo com sucesso!");
  fecharModal();
  carregarOrcamentos();
}

// GERAR PDF E REDIRECIONAR AO WHATSAPP LIMPO
async function gerarPDFEWhatsApp() {
  await salvarOrcamento();

  // 1. Gera e Baixa o PDF
  const elemento = document.createElement('div');
  elemento.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h2>FSA Clean - Orçamento #ORC-${String(orcamentoAtual.numero || orcamentoAtual.id).padStart(4, '0')}</h2>
      <p><strong>Cliente:</strong> ${orcamentoAtual.nome}</p>
      <p><strong>Serviço:</strong> Higienização de ${orcamentoAtual.tipo_estofado}</p>
      <p><strong>Valor:</strong> R$ ${orcamentoAtual.total || '0.00'}</p>
      <p><strong>Observações:</strong> ${document.getElementById('modal-obs-pdf').value}</p>
    </div>
  `;

  const opt = {
    margin: 10,
    filename: `Orcamento_FSAClean_${orcamentoAtual.nome}.pdf`,
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(elemento).save().then(() => {
    // 2. Redireciona diretamente ao WhatsApp com a MENSAGEM EXATA SOLICITADA
    const numTelefone = orcamentoAtual.telefone.replace(/\D/g, '');
    const mensagemExata = `Olá, ${orcamentoAtual.nome}! Tudo bem?
Aqui é da FSA Clean! 🧼
Já preparamos o seu orçamento detalhado de higienização. Estou enviando em anexo o arquivo PDF com todos os valores e condições.
Qualquer dúvida estou à disposição!`;

    const urlWhatsApp = `https://api.whatsapp.com/send?phone=55${numTelefone}&text=${encodeURIComponent(mensagemExata)}`;
    
    // Abre o WhatsApp na mesma aba ou nova guia
    window.open(urlWhatsApp, '_blank');
  });
}

document.addEventListener('DOMContentLoaded', carregarOrcamentos);
