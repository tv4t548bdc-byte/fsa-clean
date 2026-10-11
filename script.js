const SUPABASE_URL = "SUA_SUPABASE_URL_AQUI";
const SUPABASE_ANON_KEY = "SUA_SUPABASE_ANON_KEY_AQUI";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById('form-orcamento');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fotosInput = document.getElementById('fotos');
  
  // VALIDAÇÃO EXPLICITA DE FOTO OBRIGATÓRIA
  if (!fotosInput.files || fotosInput.files.length === 0) {
    alert("⚠️ Por favor, anexe pelo menos 1 foto do estofado para solicitar o orçamento.");
    fotosInput.focus();
    return;
  }

  if (fotosInput.files.length > 20) {
    alert("⚠️ Você pode enviar no máximo 20 fotos.");
    return;
  }

  const btnEnviar = document.getElementById('btn-enviar');
  btnEnviar.disabled = true;
  btnEnviar.innerText = "Enviando orçamento...";

  try {
    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const bairro = document.getElementById('bairro').value;
    const tipo_estofado = document.getElementById('tipo_estofado').value;
    const ultima_limpeza = document.getElementById('ultima_limpeza').value;
    const observacao = document.getElementById('observacao').value;

    const tem_pets = document.querySelector('input[name="tem_pets"]:checked').value === "true";
    const tem_manchas = document.querySelector('input[name="tem_manchas"]:checked').value === "true";

    // 1. Upload das Fotos para o Storage do Supabase
    const fotosUrls = [];
    for (let file of fotosInput.files) {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { data, error: uploadError } = await supabase.storage
        .from('orcamentos-fotos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('orcamentos-fotos')
        .getPublicUrl(fileName);

      fotosUrls.push(publicUrlData.publicUrl);
    }

    // 2. Inserção no Banco de Dados
    const { data, error } = await supabase
      .from('orcamentos')
      .insert([{
        nome,
        telefone,
        bairro,
        tipo_estofado,
        ultima_limpeza,
        tem_pets,
        tem_manchas,
        fotos: fotosUrls,
        observacao,
        status: 'novo'
      }])
      .select();

    if (error) throw error;

    // 3. Disparo de Notificação de Alerta por E-mail (API Externa)
    try {
      await fetch('https://formsubmit.co/ajax/fsaclean75@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _subject: `🚨 NOVO ORÇAMENTO #ORC-${data[0].numero || 'NOVO'}`,
          Cliente: nome,
          Telefone: telefone,
          Bairro: bairro,
          Estofado: tipo_estofado,
          Tem_Pets: tem_pets ? "Sim" : "Não",
          Tem_Manchas: tem_manchas ? "Sim" : "Não",
          Fotos_Anexadas: fotosUrls.length
        })
      });
    } catch (eErr) {
      console.log("Aviso e-mail enviado via gatilho secundário.");
    }

    alert("✅ Orçamento enviado com sucesso! Entraremos em contato em breve.");
    form.reset();

  } catch (err) {
    console.error(err);
    alert("❌ Erro ao enviar orçamento: " + err.message);
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.innerText = "Enviar Solicitação de Orçamento";
  }
});
