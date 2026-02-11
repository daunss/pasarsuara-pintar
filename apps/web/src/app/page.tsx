"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Logo } from "@/components/ui/logo"

export default function Home() {
  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll(".reveal"))
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view")
          }
        })
      },
      { threshold: 0.2 }
    )

    revealItems.forEach((item) => observer.observe(item))

    const magneticButtons = Array.from(document.querySelectorAll(".magnetic"))
    const handleMove = (event: MouseEvent) => {
      const target = event.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      const x = event.clientX - rect.left - rect.width / 2
      const y = event.clientY - rect.top - rect.height / 2
      const strength = 0.18
      target.style.transform = `translate(${x * strength}px, ${y * strength}px)`
    }
    const handleLeave = (event: MouseEvent) => {
      const target = event.currentTarget as HTMLElement
      target.style.transform = "translate(0, 0)"
    }

    magneticButtons.forEach((button) => {
      button.addEventListener("mousemove", handleMove)
      button.addEventListener("mouseleave", handleLeave)
    })

    const hero = document.querySelector(".hero") as HTMLElement | null
    const orbit = document.querySelector(".hero-orbit") as HTMLElement | null
    const handleParallax = (event: MouseEvent) => {
      if (!hero || !orbit) return
      const rect = hero.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      orbit.style.transform = `translate(${x * 12}px, ${y * 16}px)`
    }

    hero?.addEventListener("mousemove", handleParallax)

    return () => {
      observer.disconnect()
      magneticButtons.forEach((button) => {
        button.removeEventListener("mousemove", handleMove)
        button.removeEventListener("mouseleave", handleLeave)
      })
      hero?.removeEventListener("mousemove", handleParallax)
    }
  }, [])

  return (
    <main className="home">
      <div className="grain" aria-hidden="true" />
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="logo-wrap reveal" data-delay="0">
                <Logo size="lg" showText={false} href={undefined} />
              </div>
              <h1 className="hero-title reveal" data-delay="120">
                Suara Niaga Pintar
              </h1>
              <p className="hero-subtitle reveal" data-delay="200">
                Voice-First & Cooperative AI OS untuk UMKM Lokal
              </p>
              <p className="hero-description reveal" data-delay="280">
                Sistem operasi bisnis berbasis suara yang memungkinkan UMKM untuk bertransaksi,
                bernegosiasi, dan memasarkan produk hanya dengan pesan suara.
              </p>
              <div className="cta-row reveal" data-delay="360">
                <Link href="/dashboard" className="cta primary magnetic">
                  Buka Dashboard
                </Link>
                <a
                  href="https://wa.me/6285119607506"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta secondary magnetic"
                >
                  Chat via WhatsApp
                </a>
              </div>
            </div>
            <div className="hero-visual reveal" data-delay="200">
              <div className="hero-orbit" aria-hidden="true" />
              <div className="voice-panel" aria-hidden="true">
                <div className="voice-header">
                  <span className="voice-dot" />
                </div>
                <div className="voice-wave">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <div className="feature-grid">
            <article className="feature-card reveal" data-delay="0">
              <div className="feature-icon">🎤</div>
              <h3>Voice-First</h3>
              <p>Cukup kirim voice note di WhatsApp. Tidak perlu ketik atau klik menu rumit.</p>
            </article>
            <article className="feature-card reveal" data-delay="120">
              <div className="feature-icon">🤖</div>
              <h3>AI Agents</h3>
              <p>Agen AI yang bernegosiasi otomatis dengan supplier untuk mendapatkan harga terbaik.</p>
            </article>
            <article className="feature-card reveal" data-delay="240">
              <div className="feature-icon">📊</div>
              <h3>Pembukuan Otomatis</h3>
              <p>Semua transaksi tercatat otomatis. Lihat laporan kapan saja di dashboard.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="how">
        <div className="container">
          <div className="how-header reveal" data-delay="0">
            <h2>Cara Kerja</h2>
          </div>
          <div className="how-grid">
            <div className="how-step reveal" data-delay="0">
              <div className="step-badge">1️⃣</div>
              <h4>Kirim Pesan</h4>
              <p>&quot;Cari beras 25 kg maksimal 12 ribu&quot;</p>
            </div>
            <div className="how-step reveal" data-delay="120">
              <div className="step-badge">2️⃣</div>
              <h4>AI Memahami</h4>
              <p>Intent & entitas diekstrak otomatis</p>
            </div>
            <div className="how-step reveal" data-delay="240">
              <div className="step-badge">3️⃣</div>
              <h4>Agent Bekerja</h4>
              <p>Negosiasi otomatis dengan supplier</p>
            </div>
            <div className="how-step reveal" data-delay="360">
              <div className="step-badge">4️⃣</div>
              <h4>Deal!</h4>
              <p>Transaksi tercatat, stok terupdate</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <p>🏆 IMPHNEN x KOLOSAL Hackathon 2025</p>
          <p>Built with Next.js, Go, Supabase, and Kolosal AI</p>
        </div>
      </footer>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Playfair+Display:wght@500;700&family=Source+Serif+4:wght@400;600&display=swap");

        :root {
          --bg: #f5efe6;
          --bg-soft: #faf6f0;
          --text: #1b1b1b;
          --muted: #5a5a5a;
          --accent: #c35b3c;
          --accent-dark: #9f4a30;
          --green: #1f5b3b;
          --shadow: 0 20px 60px rgba(27, 27, 27, 0.08);
          --radius: 20px;
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: var(--bg);
          color: var(--text);
          font-family: "Source Serif 4", "Times New Roman", serif;
        }

        h1,
        h2,
        h3,
        h4 {
          font-family: "Playfair Display", "Times New Roman", serif;
          font-weight: 600;
          margin: 0;
        }

        p {
          margin: 0;
        }

        a {
          text-decoration: none;
          color: inherit;
        }

        .home {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
        }

        .grain {
          position: fixed;
          inset: 0;
          background-image: linear-gradient(120deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0));
          opacity: 0.35;
          pointer-events: none;
          z-index: 0;
        }

        .container {
          width: min(1100px, 90vw);
          margin: 0 auto;
        }

        .hero {
          position: relative;
          padding: 96px 0 64px;
          background: radial-gradient(circle at top, #f9f4ed, #f3eadf 65%, #efe2d4 100%);
          z-index: 1;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 48px;
          align-items: center;
        }

        .logo-wrap {
          width: 72px;
          height: 72px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--bg-soft);
          box-shadow: inset 0 0 0 1px rgba(27, 27, 27, 0.08);
        }

        .hero-title {
          font-size: clamp(2.8rem, 4vw, 4.1rem);
          line-height: 1.05;
          margin-top: 20px;
        }

        .hero-subtitle {
          margin-top: 16px;
          font-size: clamp(1.1rem, 2vw, 1.5rem);
          color: var(--green);
          font-weight: 600;
        }

        .hero-description {
          margin-top: 20px;
          font-size: 1rem;
          color: var(--muted);
          max-width: 520px;
        }

        .cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 28px;
        }

        .cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 26px;
          border-radius: 999px;
          font-family: "IBM Plex Mono", monospace;
          font-weight: 600;
          font-size: 0.95rem;
          letter-spacing: 0.02em;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          will-change: transform;
        }

        .cta.primary {
          background: var(--accent);
          color: #fff;
          box-shadow: 0 14px 30px rgba(195, 91, 60, 0.25);
        }

        .cta.primary:hover {
          background: var(--accent-dark);
          box-shadow: 0 18px 36px rgba(159, 74, 48, 0.35);
        }

        .cta.secondary {
          background: transparent;
          color: var(--accent-dark);
          border: 2px solid var(--accent-dark);
        }

        .cta.secondary:hover {
          background: rgba(195, 91, 60, 0.08);
        }

        .hero-visual {
          position: relative;
          display: flex;
          justify-content: center;
        }

        .hero-orbit {
          position: absolute;
          width: 240px;
          height: 240px;
          border-radius: 50%;
          border: 1px dashed rgba(27, 27, 27, 0.18);
          animation: orbit 12s linear infinite;
        }

        .voice-panel {
          background: #fff;
          border-radius: var(--radius);
          padding: 28px 32px;
          box-shadow: var(--shadow);
          width: min(360px, 90vw);
          position: relative;
          z-index: 1;
        }

        .voice-header {
          display: flex;
          align-items: center;
        }

        .voice-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 12px rgba(195, 91, 60, 0.6);
          animation: pulse 1.8s infinite;
        }

        .voice-wave {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin: 22px 0;
        }

        .voice-wave span {
          display: block;
          height: 48px;
          border-radius: 999px;
          background: linear-gradient(180deg, var(--accent), #f0b8a2);
          animation: wave 1.6s ease-in-out infinite;
        }

        .voice-wave span:nth-child(2) { animation-delay: 0.1s; height: 32px; }
        .voice-wave span:nth-child(3) { animation-delay: 0.2s; height: 56px; }
        .voice-wave span:nth-child(4) { animation-delay: 0.3s; height: 28px; }
        .voice-wave span:nth-child(5) { animation-delay: 0.4s; height: 52px; }
        .voice-wave span:nth-child(6) { animation-delay: 0.5s; height: 36px; }
        .voice-wave span:nth-child(7) { animation-delay: 0.6s; height: 44px; }


        .features {
          padding: 72px 0;
          background: var(--bg-soft);
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
        }

        .feature-card {
          background: #fff;
          border-radius: var(--radius);
          padding: 28px;
          box-shadow: var(--shadow);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .feature-card:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 24px 60px rgba(27, 27, 27, 0.12);
        }

        .feature-icon {
          font-size: 2.5rem;
          margin-bottom: 16px;
        }

        .feature-card h3 {
          font-size: 1.35rem;
          margin-bottom: 10px;
        }

        .feature-card p {
          color: var(--muted);
        }

        .how {
          padding: 84px 0 96px;
        }

        .how-header h2 {
          font-size: clamp(2rem, 3vw, 2.8rem);
          text-align: center;
          margin-bottom: 48px;
        }

        .how-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
        }

        .how-step {
          background: #fff;
          border-radius: var(--radius);
          padding: 22px;
          box-shadow: var(--shadow);
          text-align: center;
        }

        .step-badge {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(31, 91, 59, 0.12);
          margin: 0 auto 16px;
          font-size: 1.6rem;
        }

        .how-step h4 {
          margin-bottom: 10px;
        }

        .how-step p {
          color: var(--muted);
          font-size: 0.95rem;
        }

        .footer {
          padding: 40px 0 56px;
          background: #efe6dc;
        }

        .footer-inner {
          text-align: center;
          font-size: 0.95rem;
          color: var(--muted);
          display: grid;
          gap: 6px;
        }

        .reveal {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease, transform 0.6s ease;
          transition-delay: calc(var(--delay, 0ms));
        }

        .reveal.in-view {
          opacity: 1;
          transform: translateY(0);
        }

        .reveal[data-delay="0"] { --delay: 0ms; }
        .reveal[data-delay="120"] { --delay: 120ms; }
        .reveal[data-delay="200"] { --delay: 200ms; }
        .reveal[data-delay="240"] { --delay: 240ms; }
        .reveal[data-delay="280"] { --delay: 280ms; }
        .reveal[data-delay="360"] { --delay: 360ms; }

        @keyframes wave {
          0%,
          100% {
            transform: scaleY(0.6);
          }
          50% {
            transform: scaleY(1.1);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.3);
          }
        }

        @keyframes orbit {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .hero {
            padding: 80px 0 56px;
          }

          .cta-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .hero-visual {
            order: -1;
          }
        }
      `}</style>
    </main>
  )
}
