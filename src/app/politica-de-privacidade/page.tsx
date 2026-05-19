import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade | Scale Estratégia Digital",
  description:
    "Aviso de Privacidade da Scale Estratégia Digital — saiba como coletamos, usamos e protegemos seus dados pessoais.",
};

export default function PoliticaDePrivacidade() {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Header */}
      <header className="border-b border-gray-200 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/">
            <Image
              src="/Logos PNG/Logo.png"
              alt="Scale Estratégia Digital"
              width={160}
              height={60}
              className="object-contain"
            />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Title block */}
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-red-600 mb-2">
            Diretrizes e Políticas
          </p>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Aviso de Privacidade
          </h1>
          <p className="text-gray-600 text-sm">
            Versão original: 19/05/2025
            <br />
            Última atualização: 19/05/2026
          </p>
        </div>

        {/* Intro */}
        <section className="prose prose-gray max-w-none mb-10">
          <p>
            A <strong>Scale Estratégia Digital</strong> criou este Aviso de
            Privacidade (o &ldquo;Aviso&rdquo;) para explicar como trata dados
            pessoais quando você utiliza nossa plataforma de comunicação via
            WhatsApp Business API, acessa nosso sistema ou entra em contato
            conosco.
          </p>
          <p>
            Em caso de dúvida ou para exercer seus direitos como Titular, fale
            conosco pelos canais informados ao final deste documento.
          </p>
        </section>

        {/* Summary */}
        <nav className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-12">
          <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Sumário
          </h2>
          <ol className="space-y-1 list-decimal list-inside text-sm text-red-600">
            {[
              "Definições",
              "A quem se aplica este Aviso",
              "Quais dados coletamos e como",
              "Finalidades do tratamento",
              "Bases legais aplicáveis",
              "Com quem compartilhamos seus dados",
              "Por quanto tempo guardamos seus dados",
              "Como protegemos seus dados",
              "Direitos do Titular",
              "Cookies",
              "Transferência internacional de dados",
              "Encarregado e canais de contato",
              "Alterações desta Política",
            ].map((item, index) => (
              <li key={index}>
                <a
                  href={`#sec-${index + 1}`}
                  className="hover:underline"
                >
                  {item}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="space-y-12">
          {/* 1 */}
          <section id="sec-1">
            <SectionTitle number={1} title="Definições" />
            <p>Para facilitar a leitura, alguns termos usados neste Aviso:</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-gray-700">
              <li>
                <strong>Scale / Nós.</strong> Scale Estratégia Digital,
                responsável pela plataforma e pelo tratamento dos dados
                descritos neste Aviso.
              </li>
              <li>
                <strong>Cliente.</strong> Pessoa física ou jurídica que contrata
                os serviços da Scale e utiliza a plataforma de comunicação via
                WhatsApp Business API.
              </li>
              <li>
                <strong>Usuário.</strong> Pessoa indicada pelo Cliente para
                operar a plataforma (administrador ou atendente), ou que acessa
                nosso sistema.
              </li>
              <li>
                <strong>Titular.</strong> Pessoa natural a quem se referem os
                dados pessoais.
              </li>
              <li>
                <strong>Controlador / Operador.</strong> Conceitos da LGPD: o
                Controlador toma as decisões sobre o tratamento; o Operador
                trata os dados segundo as instruções do Controlador.
              </li>
              <li>
                <strong>LGPD.</strong> Lei nº 13.709/2018 — Lei Geral de
                Proteção de Dados Pessoais.
              </li>
              <li>
                <strong>ANPD.</strong> Autoridade Nacional de Proteção de
                Dados.
              </li>
              <li>
                <strong>Plataforma WhatsApp / Meta.</strong> Serviços operados
                pela WhatsApp LLC (grupo Meta Platforms, Inc.), integrados à
                nossa plataforma via API Oficial.
              </li>
              <li>
                <strong>Tratamento.</strong> Qualquer operação realizada com
                dados pessoais (coleta, armazenamento, transmissão, eliminação
                etc.), nos termos do art. 5º, X, da LGPD.
              </li>
            </ul>
          </section>

          {/* 2 */}
          <section id="sec-2">
            <SectionTitle number={2} title="A quem se aplica este Aviso" />
            <p>Este Aviso se aplica aos seguintes Titulares:</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-gray-700">
              <li>Visitantes do nosso site e leads que preenchem formulários de contato;</li>
              <li>Clientes que contratam os serviços da Scale;</li>
              <li>Usuários indicados pelos Clientes para operar a plataforma.</li>
            </ul>
            <p className="mt-4">
              Este Aviso não se aplica diretamente aos contatos finais (leads,
              clientes do Cliente) cujos dados o Cliente trafega pela
              plataforma. Em relação a esses dados, o Cliente atua como
              Controlador e é responsável por manter sua própria política de
              privacidade, obter os consentimentos necessários e atender às
              solicitações dos titulares.
            </p>
          </section>

          {/* 3 */}
          <section id="sec-3">
            <SectionTitle number={3} title="Quais dados coletamos e como" />

            <SubTitle>3.1. Dados que você nos fornece diretamente</SubTitle>
            <p>
              Quando você se cadastra na plataforma, preenche formulários ou
              entra em contato conosco, coletamos:
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-gray-700">
              <li>
                <strong>Identificação e contato.</strong> Nome, e-mail, telefone
                e CPF ou CNPJ (para faturamento e validação do cadastro).
              </li>
              <li>
                <strong>Credenciais de acesso.</strong> Senha (armazenada em
                hash) e registros de aceite dos Termos de Uso e deste Aviso.
              </li>
              <li>
                <strong>Mensagens espontâneas.</strong> Conteúdo de mensagens
                enviadas para suporte ou atendimento, armazenado para histórico
                e resposta.
              </li>
            </ul>

            <SubTitle className="mt-6">3.2. Dados coletados automaticamente</SubTitle>
            <p>
              Durante o uso da plataforma e navegação no nosso site,
              registramos automaticamente:
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-gray-700">
              <li>
                <strong>Logs de acesso.</strong> Endereço IP, data e hora das
                ações, dispositivo e navegador, nos termos do art. 15 da Lei nº
                12.965/2014 (Marco Civil da Internet).
              </li>
              <li>
                <strong>Cookies.</strong> Detalhados no capítulo 10 deste Aviso.
              </li>
            </ul>

            <SubTitle className="mt-6">3.3. Dados técnicos da integração com a Meta</SubTitle>
            <p>
              Para a operação da integração com a WhatsApp Business API,
              tratamos dados técnicos fornecidos pela Meta, incluindo:
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-gray-700">
              <li>App ID, WABA ID e tokens de acesso OAuth;</li>
              <li>Eventos de webhook e status de conexão;</li>
              <li>Identificadores de número de telefone registrado;</li>
              <li>Indicadores de qualidade fornecidos pela própria Meta.</li>
            </ul>
            <p className="mt-3">
              Esses dados são tratados exclusivamente para a execução do serviço,
              segurança operacional e cumprimento dos requisitos da plataforma
              Meta.
            </p>
          </section>

          {/* 4 */}
          <section id="sec-4">
            <SectionTitle number={4} title="Finalidades do tratamento" />
            <p>
              Tratamos os dados acima exclusivamente para as finalidades abaixo.
              Qualquer tratamento para finalidade não prevista neste Aviso
              dependerá de nova base legal ou novo consentimento.
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-gray-700">
              <li>
                <strong>Operação do contrato.</strong> Identificar Cliente e
                Usuário, faturar, validar o acesso, prestar suporte técnico e
                comunicar aspectos contratuais.
              </li>
              <li>
                <strong>Comunicação e marketing.</strong> Responder dúvidas,
                enviar novidades e comunicados sobre a plataforma — sempre com
                possibilidade de descadastro (opt-out).
              </li>
              <li>
                <strong>Segurança e prevenção a fraudes.</strong> Identificar
                tentativas de abuso e proteger a integridade da plataforma.
              </li>
              <li>
                <strong>Cumprimento de obrigações legais.</strong> Atender
                ordens judiciais, requisições da ANPD e demais obrigações legais.
              </li>
              <li>
                <strong>Exercício regular de direitos.</strong> Defesa em
                processos judiciais, administrativos ou arbitrais.
              </li>
              <li>
                <strong>Melhoria da plataforma.</strong> Analisar uso, desempenho
                e experiência do usuário para aprimoramento contínuo do serviço.
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section id="sec-5">
            <SectionTitle number={5} title="Bases legais aplicáveis" />
            <p>
              Cada atividade de tratamento encontra base legal na LGPD,
              conforme descrito abaixo:
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Finalidade</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Base legal (LGPD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ["Execução do contrato e suporte", "Art. 7º, V — execução de contrato"],
                    ["Faturamento e cadastro", "Art. 7º, V — execução de contrato"],
                    ["Comunicações de marketing", "Art. 7º, I — consentimento"],
                    ["Segurança e prevenção a fraudes", "Art. 7º, IX — legítimo interesse"],
                    ["Obrigações legais", "Art. 7º, II — obrigação legal"],
                    ["Defesa em processos", "Art. 7º, VI — exercício regular de direitos"],
                    ["Melhoria da plataforma", "Art. 7º, IX — legítimo interesse"],
                  ].map(([fin, base], i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{fin}</td>
                      <td className="px-4 py-3 text-gray-600">{base}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Você pode revogar consentimentos a qualquer tempo pelos canais
              informados no capítulo 12 deste Aviso.
            </p>
          </section>

          {/* 6 */}
          <section id="sec-6">
            <SectionTitle number={6} title="Com quem compartilhamos seus dados" />
            <p>
              A Scale compartilha dados pessoais apenas com terceiros
              indispensáveis à operação da plataforma e à prestação dos
              serviços.
            </p>

            <SubTitle className="mt-6">6.1. Operadores</SubTitle>
            <p>
              Terceiros que tratam dados sob nossas instruções, com contratos
              de tratamento e padrões mínimos de segurança compatíveis com a LGPD:
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-gray-700">
              <li>
                <strong>Infraestrutura de hospedagem.</strong> Provedores de
                nuvem responsáveis por armazenar e processar dados da
                plataforma.
              </li>
              <li>
                <strong>Plataforma de e-mail transacional.</strong> Envio de
                notificações, confirmações de cadastro e comunicações do
                sistema.
              </li>
              <li>
                <strong>Suíte de produtividade corporativa.</strong> Ferramentas
                internas de comunicação e gestão operacional.
              </li>
            </ul>

            <SubTitle className="mt-6">6.2. Controladores parceiros</SubTitle>
            <p>
              Terceiros que tratam dados com finalidades próprias, de forma
              autônoma:
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-gray-700">
              <li>
                <strong>Meta Platforms, Inc. / WhatsApp LLC.</strong> Provedora
                da API oficial do WhatsApp Business Platform. A Scale opera
                como parceira integrada dessa API, e a relação com a Meta é
                regida pelos{" "}
                <a
                  href="https://www.whatsapp.com/legal/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:underline"
                >
                  termos da plataforma
                </a>
                .
              </li>
              <li>
                <strong>Plataformas de pagamento.</strong> Processam dados de
                faturamento conforme suas próprias políticas de privacidade.
              </li>
            </ul>

            <SubTitle className="mt-6">6.3. Integrações configuradas pelo Cliente</SubTitle>
            <p>
              O Cliente pode configurar integrações com outros canais e
              sistemas (CRMs, portais imobiliários, etc.). Os dados que trafegam
              por essas integrações são governados pelos termos das respectivas
              plataformas, sobre as quais a Scale não tem responsabilidade. Cabe
              ao Cliente revisar os termos de cada integração ativada.
            </p>
          </section>

          {/* 7 */}
          <section id="sec-7">
            <SectionTitle number={7} title="Por quanto tempo guardamos seus dados" />
            <ul className="mt-3 space-y-3 list-disc list-inside text-gray-700">
              <li>
                <strong>Cadastro ativo.</strong> Enquanto o Cliente mantiver
                contrato ativo, os dados cadastrais são tratados para execução
                do serviço.
              </li>
              <li>
                <strong>Após o encerramento.</strong> Os dados podem ser
                conservados por até 5 (cinco) anos após o término da relação,
                com base em legítimo interesse, para defesa em eventuais
                processos (arts. 7º, IX, e 16, II, LGPD).
              </li>
              <li>
                <strong>Logs de acesso.</strong> Mantidos por, no mínimo, 6
                (seis) meses, em cumprimento ao art. 15 da Lei nº 12.965/2014
                (Marco Civil da Internet).
              </li>
              <li>
                <strong>Obrigações legais específicas.</strong> Documentos
                fiscais e demais dados sujeitos a prazos de guarda definidos em
                lei são conservados pelo prazo correspondente.
              </li>
            </ul>
            <p className="mt-4">
              A solicitação de exclusão pode ser feita a qualquer momento pelo
              e-mail{" "}
              <a
                href="mailto:privacidade@scaleestratedigital.com.br"
                className="text-red-600 hover:underline"
              >
                privacidade@scaleestratedigital.com.br
              </a>
              . Após o atendimento, os dados são deletados permanentemente,
              ressalvadas as hipóteses legais de conservação.
            </p>
          </section>

          {/* 8 */}
          <section id="sec-8">
            <SectionTitle number={8} title="Como protegemos seus dados" />
            <p>
              A Scale adota medidas técnicas e organizacionais para proteger os
              dados pessoais sob sua responsabilidade contra acessos não
              autorizados, perda, destruição e uso indevido. Entre as medidas:
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-gray-700">
              <li>Controle de acesso baseado em funções;</li>
              <li>Autenticação segura nos sistemas internos;</li>
              <li>Criptografia em trânsito (TLS/HTTPS);</li>
              <li>Gestão segura de credenciais;</li>
              <li>Monitoramento de eventos de segurança;</li>
              <li>Contratos de tratamento com todos os Operadores.</li>
            </ul>
            <p className="mt-4">
              Nenhuma operação realizada via internet é 100% segura. Caso
              identifique vulnerabilidade ou suspeita de incidente envolvendo
              nossos sistemas, entre em contato imediato pelo e-mail{" "}
              <a
                href="mailto:privacidade@scaleestratedigital.com.br"
                className="text-red-600 hover:underline"
              >
                privacidade@scaleestratedigital.com.br
              </a>
              .
            </p>
          </section>

          {/* 9 */}
          <section id="sec-9">
            <SectionTitle number={9} title="Direitos do Titular" />
            <p>
              A LGPD assegura a você, na qualidade de Titular, os direitos
              abaixo, que podem ser exercidos pelo e-mail{" "}
              <a
                href="mailto:privacidade@scaleestratedigital.com.br"
                className="text-red-600 hover:underline"
              >
                privacidade@scaleestratedigital.com.br
              </a>
              :
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-gray-700">
              <li>Confirmação e acesso ao tratamento de seus dados;</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>
                Anonimização, bloqueio ou eliminação de dados desnecessários,
                excessivos ou tratados em desconformidade com a LGPD;
              </li>
              <li>
                Portabilidade dos dados a outro fornecedor, observados o segredo
                comercial e industrial;
              </li>
              <li>
                Eliminação dos dados tratados com consentimento, ressalvadas as
                hipóteses legais de conservação;
              </li>
              <li>
                Informação sobre as entidades com as quais a Scale compartilha
                seus dados;
              </li>
              <li>Revogação de consentimento a qualquer tempo, gratuitamente;</li>
              <li>Oposição ao tratamento realizado com base em legítimo interesse;</li>
              <li>Revisão de decisões automatizadas que afetem seus interesses;</li>
              <li>Reclamação perante a ANPD ou demais órgãos competentes.</li>
            </ul>
            <p className="mt-4">
              Para garantir que os direitos sejam exercidos pelo Titular ou seu
              representante legal, a Scale pode solicitar informações ou
              comprovações de identidade. Atenderemos às solicitações dentro dos
              prazos previstos pela LGPD.
            </p>
          </section>

          {/* 10 */}
          <section id="sec-10">
            <SectionTitle number={10} title="Cookies" />
            <p>
              Nossa plataforma utiliza cookies para garantir o funcionamento
              técnico, medir audiência e melhorar a experiência de uso. Os
              cookies utilizados são de duas naturezas:
            </p>
            <ul className="mt-3 space-y-3 list-disc list-inside text-gray-700">
              <li>
                <strong>Cookies estritamente necessários.</strong> Indispensáveis
                ao funcionamento e à segurança da plataforma. Não dependem de
                consentimento, com base em legítimo interesse e obrigação legal
                (art. 7º, II e IX, LGPD).
              </li>
              <li>
                <strong>Cookies opcionais</strong> (estatísticos, de performance
                e funcionais). Ativados somente mediante o seu consentimento.
                Você pode aceitar, rejeitar ou alterar sua escolha a qualquer
                momento. A rejeição não compromete o funcionamento básico da
                plataforma.
              </li>
            </ul>
          </section>

          {/* 11 */}
          <section id="sec-11">
            <SectionTitle number={11} title="Transferência internacional de dados" />
            <p>
              Para entregar nossos serviços e operar a infraestrutura, podemos
              transferir dados pessoais para fora do Brasil. As transferências
              observam o art. 33 da LGPD e são protegidas por cláusulas-padrão
              contratuais, decisões de adequação do país de destino ou outras
              salvaguardas previstas em lei.
            </p>
            <p className="mt-3">
              As principais regiões de destino incluem:
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-gray-700">
              <li>
                <strong>Brasil</strong> — provedores nacionais utilizados na
                operação corporativa;
              </li>
              <li>
                <strong>União Europeia</strong> — provedores de infraestrutura
                sob regime do GDPR;
              </li>
              <li>
                <strong>Estados Unidos e outras regiões</strong> — Meta
                Platforms e demais ferramentas de operação e mensuração.
              </li>
            </ul>
          </section>

          {/* 12 */}
          <section id="sec-12">
            <SectionTitle number={12} title="Encarregado e canais de contato" />
            <p>
              Em cumprimento ao art. 41 da LGPD, a Scale mantém responsável
              pela Proteção de Dados Pessoais designado internamente, que pode
              ser contatado pelos canais abaixo:
            </p>
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3 text-sm">
              <div>
                <span className="font-semibold text-gray-700">
                  E-mail para privacidade, LGPD e exercício de direitos:
                </span>{" "}
                <a
                  href="mailto:privacidade@scaleestratedigital.com.br"
                  className="text-red-600 hover:underline"
                >
                  privacidade@scaleestratedigital.com.br
                </a>
              </div>
              <div>
                <span className="font-semibold text-gray-700">
                  E-mail para comunicação geral e suporte:
                </span>{" "}
                <a
                  href="mailto:contato@scaleestratedigital.com.br"
                  className="text-red-600 hover:underline"
                >
                  contato@scaleestratedigital.com.br
                </a>
              </div>
            </div>
          </section>

          {/* 13 */}
          <section id="sec-13">
            <SectionTitle number={13} title="Alterações desta Política" />
            <p>
              Este Aviso pode ser atualizado a qualquer tempo para refletir
              mudanças na operação, na legislação ou nas práticas de tratamento
              da Scale. Quando houver alterações relevantes, o Titular será
              notificado pelos canais cadastrados ou por aviso na plataforma, e
              a versão atualizada valerá a partir de sua publicação. A
              continuidade no uso da plataforma após a atualização confirmará a
              ciência e a vigência do novo Aviso.
            </p>
          </section>
        </div>

        {/* Footer divider */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-400">
          <p>
            © {new Date().getFullYear()} Scale Estratégia Digital. Todos os
            direitos reservados.
          </p>
          <p className="mt-1">
            Última atualização: 19 de maio de 2026
          </p>
        </div>
      </main>
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────────────── */

function SectionTitle({
  number,
  title,
}: {
  number: number;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-3 text-xl font-bold text-gray-900 mb-4">
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white text-sm font-bold shrink-0">
        {number}
      </span>
      {title}
    </h2>
  );
}

function SubTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-base font-semibold text-gray-800 mb-2 ${className}`}>
      {children}
    </h3>
  );
}
