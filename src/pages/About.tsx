import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import logoIcon from '@/assets/logo-icon.png';

export default function About() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <img src={logoIcon} alt="" className="h-10 w-10" />
          <h1 className="text-3xl font-bold text-foreground">Sobre Nós</h1>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">A Nossa Missão</h2>
            <p className="leading-relaxed">
              O <strong className="text-foreground">Dinheiro em Mão</strong> nasceu da necessidade real de milhares de angolanos que perdem horas à procura de caixas eletrónicos com dinheiro disponível. A nossa missão é simples: poupar o seu tempo e reduzir a frustração.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Como Funciona</h2>
            <p className="leading-relaxed">
              Trabalhamos com uma rede de agentes locais verificados que monitorizam os ATMs em diversas zonas do país. Estes agentes actualizam em tempo real o estado de cada caixa — se tem dinheiro, se está operacional, e o tamanho da fila.
            </p>
            <p className="leading-relaxed">
              Os utilizadores subscrevem as zonas do seu interesse e recebem informações actualizadas, permitindo-lhes dirigir-se directamente a um ATM funcional.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">A Nossa Equipa</h2>
            <p className="leading-relaxed">
              Somos uma equipa angolana dedicada a criar soluções tecnológicas que resolvem problemas do dia-a-dia. Acreditamos que a tecnologia pode simplificar a vida de todos e contribuir para uma Angola mais eficiente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Contacto</h2>
            <p className="leading-relaxed">
              Tem alguma questão ou sugestão? Entre em contacto connosco através do email{' '}
              <a href="mailto:docflex.angola@gmail.com" className="text-primary hover:underline">docflex.angola@gmail.com</a>{' '}
              ou pelo telefone{' '}
              <a href="tel:+244933986318" className="text-primary hover:underline">+244 933 986 318</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
