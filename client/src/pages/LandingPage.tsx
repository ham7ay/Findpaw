import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import AIShowcase from '../components/landing/AIShowcase';
import { Testimonials, Pricing, CTA, Footer } from '../components/landing/Sections';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <div id="features"><Features /></div>
        <div id="ai"><AIShowcase /></div>
        <Testimonials />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
