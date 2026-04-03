import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Políticas e Condições de Uso</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          <p className="leading-relaxed">
            Última actualização: Janeiro de 2025
          </p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Aceitação dos Termos</h2>
            <p className="leading-relaxed">
              Ao utilizar a plataforma Dinheiro em Mão, o utilizador concorda com os presentes termos e condições. Caso não concorde, deverá cessar a utilização imediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Descrição do Serviço</h2>
            <p className="leading-relaxed">
              O Dinheiro em Mão é uma plataforma que disponibiliza informações sobre a disponibilidade de dinheiro em caixas eletrónicos (ATMs) em Angola. As informações são recolhidas por agentes locais verificados e actualizadas em tempo real.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Subscrições e Pagamentos</h2>
            <p className="leading-relaxed">
              O acesso às informações detalhadas de cada zona requer uma subscrição paga. Os pagamentos são processados através de Multicaixa Express. As subscrições têm validade mensal e não são reembolsáveis após activação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Precisão das Informações</h2>
            <p className="leading-relaxed">
              Embora envidemos todos os esforços para garantir a precisão das informações, o Dinheiro em Mão não garante que o estado dos ATMs seja 100% exacto em todos os momentos. As condições podem mudar entre actualizações dos agentes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Conta de Utilizador</h2>
            <p className="leading-relaxed">
              O utilizador é responsável por manter a confidencialidade das suas credenciais de acesso. Qualquer actividade realizada na sua conta é da sua responsabilidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Privacidade e Dados Pessoais</h2>
            <p className="leading-relaxed">
              Recolhemos apenas os dados necessários para o funcionamento do serviço: nome, telefone, email e localização aproximada. Os seus dados não são partilhados com terceiros sem o seu consentimento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Propriedade Intelectual</h2>
            <p className="leading-relaxed">
              Todo o conteúdo, design e funcionalidades da plataforma são propriedade do Dinheiro em Mão. É proibida a reprodução ou distribuição sem autorização prévia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Limitação de Responsabilidade</h2>
            <p className="leading-relaxed">
              O Dinheiro em Mão não se responsabiliza por perdas ou danos resultantes da utilização ou impossibilidade de utilização do serviço, incluindo deslocações a ATMs sem dinheiro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Alterações aos Termos</h2>
            <p className="leading-relaxed">
              Reservamo-nos o direito de alterar estes termos a qualquer momento. As alterações entram em vigor após publicação na plataforma. O uso continuado do serviço constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Contacto</h2>
            <p className="leading-relaxed">
              Para questões sobre estes termos, contacte-nos em{' '}
              <a href="mailto:docflex.angola@gmail.com" className="text-primary hover:underline">docflex.angola@gmail.com</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
