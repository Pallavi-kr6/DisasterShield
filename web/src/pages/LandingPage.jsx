import { useState, useEffect } from "react";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy: #0a1628;
    --navy-mid: #112040;
    --sky: #1d6fcf;
    --sky-light: #3b8fe8;
    --ice: #e8f4fd;
    --ice-2: #d1eaf9;
    --white: #ffffff;
    --muted: #6b82a0;
    --accent: #00c9a7;
    --accent-warm: #f59e0b;
    --danger: #ef4444;
    --card-bg: rgba(255,255,255,0.92);
    --border: rgba(29,111,207,0.14);
    --shadow-card: 0 8px 40px rgba(10,22,40,0.10);
    --shadow-float: 0 4px 24px rgba(10,22,40,0.13);
    --font-display: 'Sora', sans-serif;
    --font-body: 'DM Sans', sans-serif;
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: var(--font-body);
    background: #f0f6ff;
    color: var(--navy);
    line-height: 1.6;
    overflow-x: hidden;
  }

  /* NAV */
  nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    background: rgba(255,255,255,0.88);
    backdrop-filter: blur(18px);
    border-bottom: 1px solid var(--border);
    height: 64px;
    display: flex; align-items: center;
    padding: 0 6%;
    transition: box-shadow 0.3s;
  }
  nav.scrolled { box-shadow: 0 2px 32px rgba(10,22,40,0.10); }
  .nav-inner { display: flex; align-items: center; justify-content: space-between; width: 100%; max-width: 1200px; margin: auto; }
  .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .logo-icon {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, var(--sky) 0%, var(--accent) 100%);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .logo-icon svg { width: 20px; height: 20px; }
  .logo-text { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; color: var(--navy); letter-spacing: -0.3px; }
  .logo-text span { color: var(--sky); }
  .nav-links { display: flex; align-items: center; gap: 36px; list-style: none; }
  .nav-links a { font-size: 0.88rem; font-weight: 500; color: var(--muted); text-decoration: none; transition: color 0.2s; }
  .nav-links a:hover { color: var(--navy); }
  .btn-login {
    background: var(--sky); color: #fff;
    border: none; border-radius: 9px;
    padding: 9px 22px; font-family: var(--font-body);
    font-size: 0.87rem; font-weight: 500;
    cursor: pointer; text-decoration: none;
    transition: background 0.2s, transform 0.15s;
    display: inline-block;
  }
  .btn-login:hover { background: var(--sky-light); transform: translateY(-1px); }

  /* HERO */
  .hero {
    min-height: 100vh;
    display: flex; align-items: center;
    padding: 100px 6% 60px;
    position: relative;
    background: linear-gradient(155deg, #eaf3ff 0%, #f7fcff 40%, #e8f9f4 100%);
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute; top: -120px; right: -120px;
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(29,111,207,0.10) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
  }
  .hero::after {
    content: '';
    position: absolute; bottom: -80px; left: 10%;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(0,201,167,0.08) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
  }
  .hero-inner { display: flex; align-items: center; gap: 60px; max-width: 1200px; margin: auto; width: 100%; position: relative; z-index: 1; }
  .hero-left { flex: 1; min-width: 0; }
  .hero-badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(29,111,207,0.10);
    border: 1px solid rgba(29,111,207,0.22);
    border-radius: 100px; padding: 5px 14px;
    font-size: 0.78rem; font-weight: 600; color: var(--sky);
    letter-spacing: 0.4px; margin-bottom: 22px;
    text-transform: uppercase;
  }
  .badge-dot { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }

  h1 {
    font-family: var(--font-display); font-size: clamp(2.6rem, 5vw, 3.8rem);
    font-weight: 800; line-height: 1.12; letter-spacing: -1.5px;
    color: var(--navy); margin-bottom: 8px;
  }
  h1 .gradient-text {
    background: linear-gradient(90deg, var(--sky) 0%, var(--accent) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .hero-sub {
    font-family: var(--font-display); font-size: 1.35rem; font-weight: 500;
    color: var(--sky); margin-bottom: 18px; letter-spacing: -0.2px;
  }
  .hero-desc {
    font-size: 1rem; color: var(--muted); line-height: 1.75;
    max-width: 480px; margin-bottom: 36px;
  }
  .hero-btns { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .btn-primary {
    background: linear-gradient(90deg, var(--sky) 0%, var(--sky-light) 100%);
    color: #fff; border: none; border-radius: 11px;
    padding: 14px 30px; font-family: var(--font-body); font-size: 0.95rem; font-weight: 600;
    cursor: pointer; transition: transform 0.18s, box-shadow 0.18s;
    box-shadow: 0 4px 20px rgba(29,111,207,0.30);
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(29,111,207,0.38); }
  .btn-outline {
    background: transparent; color: var(--navy);
    border: 1.5px solid rgba(10,22,40,0.18); border-radius: 11px;
    padding: 13px 28px; font-family: var(--font-body); font-size: 0.95rem; font-weight: 500;
    cursor: pointer; display: flex; align-items: center; gap: 8px;
    transition: background 0.18s, border-color 0.18s;
  }
  .btn-outline:hover { background: rgba(10,22,40,0.05); border-color: rgba(10,22,40,0.3); }
  .play-icon {
    width: 26px; height: 26px; background: var(--sky);
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
  }

  /* HERO RIGHT — DASHBOARD MOCKUP */
  .hero-right { flex: 1; min-width: 0; position: relative; display: flex; justify-content: center; }
  .dashboard-card {
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 20px 70px rgba(10,22,40,0.13);
    padding: 20px;
    width: 100%; max-width: 480px;
    border: 1px solid var(--border);
    position: relative;
  }
  .dash-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .dash-title { font-family: var(--font-display); font-weight: 700; font-size: 0.9rem; color: var(--navy); }
  .dash-live { display: flex; align-items: center; gap: 5px; font-size: 0.73rem; color: var(--accent); font-weight: 600; }
  .dash-live-dot { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: pulse 1.5s infinite; }

  /* Fake map */
  .dash-map {
    background: linear-gradient(145deg, #ddeeff 0%, #c8e8f7 50%, #d5f0ea 100%);
    border-radius: 12px; height: 160px; position: relative; overflow: hidden; margin-bottom: 14px;
  }
  .map-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(29,111,207,0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(29,111,207,0.08) 1px, transparent 1px);
    background-size: 28px 28px;
  }
  .map-pin {
    position: absolute; width: 14px; height: 14px;
    background: var(--danger); border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg); border: 2px solid #fff;
    box-shadow: 0 2px 8px rgba(239,68,68,0.4);
  }
  .map-pin::after {
    content: ''; position: absolute; width: 36px; height: 36px;
    background: rgba(239,68,68,0.15); border-radius: 50%;
    top: 50%; left: 50%; transform: translate(-50%,-50%);
    animation: ripple 2s infinite;
  }
  @keyframes ripple { 0%{opacity:1;transform:translate(-50%,-50%) scale(0.5)} 100%{opacity:0;transform:translate(-50%,-50%) scale(2)} }
  .map-pin.blue { background: var(--sky); box-shadow: 0 2px 8px rgba(29,111,207,0.4); }
  .map-pin.blue::after { background: rgba(29,111,207,0.15); }
  .map-pin.green { background: var(--accent); box-shadow: 0 2px 8px rgba(0,201,167,0.4); }
  .map-pin.green::after { background: rgba(0,201,167,0.15); }

  /* Stats row */
  .dash-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  .dash-stat {
    background: var(--ice); border-radius: 10px; padding: 11px 12px;
    border: 1px solid rgba(29,111,207,0.10);
  }
  .dash-stat-num { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; color: var(--navy); }
  .dash-stat-label { font-size: 0.68rem; color: var(--muted); font-weight: 500; margin-top: 1px; }

  /* Mini chart */
  .dash-chart-row { display: flex; align-items: flex-end; gap: 5px; height: 48px; }
  .dash-bar {
    flex: 1; border-radius: 4px 4px 0 0;
    background: linear-gradient(180deg, var(--sky-light) 0%, var(--sky) 100%);
    transition: height 0.5s;
  }
  .dash-bar.accent { background: linear-gradient(180deg, #2de0c2 0%, var(--accent) 100%); }

  /* FLOATING CARDS */
  .float-card {
    position: absolute;
    background: #fff; border-radius: 14px; padding: 12px 16px;
    box-shadow: var(--shadow-float); border: 1px solid var(--border);
    white-space: nowrap;
    animation: floatY 4s ease-in-out infinite;
  }
  @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  .float-card.top-left { top: -28px; left: -48px; animation-delay: 0s; }
  .float-card.bottom-right { bottom: -22px; right: -36px; animation-delay: 1.3s; }
  .float-card.mid-right { top: 50%; right: -60px; transform: translateY(-50%); animation-delay: 0.7s; }
  .fc-label { font-size: 0.67rem; color: var(--muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
  .fc-value { font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: var(--navy); }
  .fc-badge {
    display: inline-flex; align-items: center; gap: 5px;
    background: rgba(239,68,68,0.10); border-radius: 7px;
    padding: 4px 10px; font-size: 0.75rem; font-weight: 700; color: var(--danger);
  }
  .fc-badge-dot { width: 6px; height: 6px; background: var(--danger); border-radius: 50%; animation: pulse 1s infinite; }

  /* FEATURES */
  .features {
    padding: 90px 6%;
    background: #fff;
  }
  .section-label {
    font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;
    color: var(--sky); margin-bottom: 12px; text-align: center;
  }
  .section-title {
    font-family: var(--font-display); font-size: clamp(1.8rem, 3vw, 2.5rem);
    font-weight: 800; letter-spacing: -0.8px; color: var(--navy);
    text-align: center; margin-bottom: 14px;
  }
  .section-desc { text-align: center; color: var(--muted); font-size: 1rem; max-width: 520px; margin: 0 auto 52px; }
  .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 22px; max-width: 1100px; margin: auto; }
  .feature-card {
    background: linear-gradient(145deg, #f7fbff 0%, #ffffff 100%);
    border: 1px solid var(--border); border-radius: 18px; padding: 30px 26px;
    transition: transform 0.22s, box-shadow 0.22s;
    cursor: default;
  }
  .feature-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card); }
  .feature-icon {
    width: 52px; height: 52px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 18px; font-size: 24px;
  }
  .icon-blue { background: rgba(29,111,207,0.10); }
  .icon-green { background: rgba(0,201,167,0.12); }
  .icon-amber { background: rgba(245,158,11,0.12); }
  .feature-name { font-family: var(--font-display); font-size: 1.05rem; font-weight: 700; color: var(--navy); margin-bottom: 8px; }
  .feature-desc { font-size: 0.91rem; color: var(--muted); line-height: 1.65; }

  /* STATS BAND */
  .stats-band {
    background: linear-gradient(90deg, var(--navy) 0%, var(--navy-mid) 100%);
    padding: 60px 6%;
  }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 30px; max-width: 1000px; margin: auto; }
  .stat-block { text-align: center; }
  .stat-num { font-family: var(--font-display); font-size: 2.5rem; font-weight: 800; color: #fff; letter-spacing: -1px; }
  .stat-num span { color: var(--accent); }
  .stat-lbl { font-size: 0.88rem; color: rgba(255,255,255,0.55); margin-top: 4px; }

  /* FOOTER */
  footer {
    background: var(--navy);
    padding: 50px 6% 30px;
    color: rgba(255,255,255,0.6);
  }
  .footer-inner { max-width: 1200px; margin: auto; }
  .footer-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 40px; flex-wrap: wrap; margin-bottom: 40px; }
  .footer-brand .logo-text { color: #fff; font-size: 1.05rem; }
  .footer-brand p { font-size: 0.85rem; color: rgba(255,255,255,0.45); max-width: 240px; margin-top: 8px; line-height: 1.6; }
  .footer-col h4 { font-family: var(--font-display); font-weight: 600; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.8px; color: rgba(255,255,255,0.8); margin-bottom: 14px; }
  .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 9px; }
  .footer-col ul li a { font-size: 0.85rem; color: rgba(255,255,255,0.45); text-decoration: none; transition: color 0.2s; }
  .footer-col ul li a:hover { color: #fff; }
  .footer-bottom { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 22px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
  .footer-bottom p { font-size: 0.80rem; }
  .contributors { font-size: 0.80rem; color: rgba(255,255,255,0.4); }
  .contributors span { color: rgba(255,255,255,0.65); }

  /* RESPONSIVE */
  @media (max-width: 860px) {
    .hero-inner { flex-direction: column; text-align: center; }
    .hero-desc { margin: 0 auto 28px; }
    .hero-btns { justify-content: center; }
    .hero-right { width: 100%; }
    .float-card.top-left { top: -20px; left: 10px; }
    .float-card.bottom-right { bottom: -16px; right: 10px; }
    .float-card.mid-right { display: none; }
    .nav-links { display: none; }
  }
`;

const features = [
  {
    icon: "🛰️",
    iconClass: "icon-blue",
    name: "Real-time Alerts",
    desc: "Get instant notifications for earthquakes, floods, cyclones, and wildfires. Our sensors scan 24/7 across thousands of data streams.",
  },
  {
    icon: "🧠",
    iconClass: "icon-green",
    name: "AI Insights",
    desc: "Machine learning models predict disaster intensity, spread, and impact zones up to 72 hours ahead with high accuracy.",
  },
  {
    icon: "🌐",
    iconClass: "icon-amber",
    name: "Wide Coverage",
    desc: "Monitor 180+ countries with localized risk scores, multilingual alerts, and regional emergency response integrations.",
  },
];

const bars = [55, 75, 40, 90, 62, 80, 50, 95, 70, 85, 60, 78];

export default function DisasterShield() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{style}</style>

      {/* NAV */}
      <nav className={scrolled ? "scrolled" : ""}>
        <div className="nav-inner">
          <a href="#" className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L3 7v6c0 5.25 3.75 10.15 9 11.25C17.25 23.15 21 18.25 21 13V7L12 2z" fill="rgba(255,255,255,0.15)" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <span className="logo-text">Disaster<span>Shield</span></span>
          </a>

          <ul className="nav-links">
            {["Home", "Features", "About", "Contact"].map((l) => (
              <li key={l}><a href={`#${l.toLowerCase()}`}>{l}</a></li>
            ))}
          </ul>

          <a href="/login" className="btn-login">Login</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge">
              <span className="badge-dot" />
              AI-Powered Disaster Intelligence
            </div>
            <h1>
              <span className="gradient-text">Disaster</span>
              {" "}Shield
            </h1>
            <p className="hero-sub">Stay Safe. Stay Prepared.</p>
            <p className="hero-desc">
              Harness real-time AI monitoring, predictive analytics, and instant multi-channel alerts to protect communities before disaster strikes — not after.
            </p>
         <div className="hero-btns">
  <button className="btn-primary">
    Get Started →
  </button>

  <button 
    className="btn-outline"
    onClick={() => window.open("https://youtu.be/1QvLLQa8azk?si=15vVvMrq3m0-KC6T", "_blank")}
  >
    <span className="play-icon">
      <svg width="9" height="11" viewBox="0 0 9 11" fill="white">
        <path d="M0 0l9 5.5L0 11V0z" />
      </svg>
    </span>
    Watch Demo
  </button>
</div>
          </div>

          {/* DASHBOARD MOCKUP */}
          <div className="hero-right">
            <div className="dashboard-card">
              <div className="dash-topbar">
                <span className="dash-title">DisasterShield Dashboard</span>
                <span className="dash-live"><span className="dash-live-dot" />Live</span>
              </div>

              {/* MAP */}
              <div className="dash-map">
                <div className="map-grid" />
                <div className="map-pin" style={{ top: "38%", left: "28%" }} />
                <div className="map-pin blue" style={{ top: "55%", left: "58%" }} />
                <div className="map-pin green" style={{ top: "25%", left: "65%" }} />
                <div className="map-pin" style={{ top: "68%", left: "40%" }} />
                <div className="map-pin blue" style={{ top: "42%", left: "78%" }} />
              </div>

              {/* STAT ROW */}
              <div className="dash-stats">
                {[
                  { num: "3K+", label: "Alerts Today" },
                  { num: "99.7%", label: "Uptime" },
                  { num: "12ms", label: "Latency" },
                ].map((s) => (
                  <div className="dash-stat" key={s.label}>
                    <div className="dash-stat-num">{s.num}</div>
                    <div className="dash-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* MINI CHART */}
              <div className="dash-chart-row">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className={`dash-bar${i % 4 === 2 ? " accent" : ""}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* FLOATING CARDS */}
            <div className="float-card top-left">
              <div className="fc-label">Alerts Monitored</div>
              <div className="fc-value">3,000+</div>
            </div>

            <div className="float-card bottom-right">
              <div className="fc-label">Damage Prevented</div>
              <div className="fc-value">₹1M+</div>
            </div>

            <div className="float-card mid-right">
              <span className="fc-badge">
                <span className="fc-badge-dot" />
                ⚠ Storm Warning
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <div className="stats-band">
        <div className="stats-grid">
          {[
            { num: "3K", suffix: "+", label: "Alerts Monitored Daily" },
            { num: "99", suffix: ".7%", label: "System Uptime" },
            { num: "180", suffix: "+", label: "Countries Covered" },
            { num: "72", suffix: "hr", label: "Prediction Window" },
          ].map((s) => (
            <div className="stat-block" key={s.label}>
              <div className="stat-num">{s.num}<span>{s.suffix}</span></div>
              <div className="stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="section-label">What We Offer</div>
        <h2 className="section-title">Built for Every Emergency</h2>
        <p className="section-desc">DisasterShield combines satellite data, AI models, and community networks to give responders a decisive edge.</p>
        <div className="features-grid">
          {features.map((f) => (
            <div className="feature-card" key={f.name}>
              <div className={`feature-icon ${f.iconClass}`}>{f.icon}</div>
              <div className="feature-name">{f.name}</div>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="logo">
                <div className="logo-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L3 7v6c0 5.25 3.75 10.15 9 11.25C17.25 23.15 21 18.25 21 13V7L12 2z" fill="rgba(255,255,255,0.15)" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <span className="logo-text">Disaster<span style={{ color: "var(--accent)" }}>Shield</span></span>
              </div>
              <p>AI-powered disaster management. Protecting lives through intelligence and speed.</p>
            </div>

            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                {["Features", "Dashboard", "Alerts", "API"].map((l) => (
                  <li key={l}><a href="#">{l}</a></li>
                ))}
              </ul>
            </div>

            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                {["About", "Blog", "Careers", "Press"].map((l) => (
                  <li key={l}><a href="#">{l}</a></li>
                ))}
              </ul>
            </div>

            <div className="footer-col">
              <h4>Contact</h4>
              <ul>
                <li><a href="#">support@disastershield.ai</a></li>
                <li><a href="#">+91 98765 43210</a></li>
                <li><a href="#">Twitter / X</a></li>
                <li><a href="#">LinkedIn</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>©DisasterShield. All rights reserved.</p>
            <div className="contributors">
              Contributors:{" "}
              <span>Pallavi Kumari,Aakash Kumar, Aastha Singh, Adriza Srivastava, Rahul Jaiswal</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
