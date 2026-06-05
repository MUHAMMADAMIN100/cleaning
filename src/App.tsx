import { Header } from './components/sections/Header';
import { Hero } from './components/sections/Hero';
import { About } from './components/sections/About';
import { Tariffs } from './components/sections/Tariffs';
import { Calculator } from './components/sections/Calculator';
import { Footer } from './components/sections/Footer';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <About />
        <Tariffs />
        <Calculator />
      </main>
      <Footer />
    </div>
  );
}

export default App;
