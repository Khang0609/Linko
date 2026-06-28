import React, { useState } from 'react';
import { Menu, X, ArrowRight, ExternalLink } from 'lucide-react';

function SuiLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="8" fill="#1E50A2" />
      <path
        d="M14 6C14 6 9 10.5 9 15C9 17.761 11.239 20 14 20C16.761 20 19 17.761 19 15C19 10.5 14 6 14 6Z"
        fill="white"
        opacity="0.9"
      />
      <path
        d="M14 11C14 11 11 13.5 11 16C11 17.657 12.343 19 14 19C15.657 19 17 17.657 17 16C17 13.5 14 11 14 11Z"
        fill="#3b82f6"
      />
    </svg>
  );
}

function GlowOrb() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -60%)',
        width: '480px',
        height: '480px',
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(30,80,162,0.45) 0%, rgba(59,130,246,0.18) 45%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }}
    />
  );
}

function GridLines() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }}
    />
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background:
          'radial-gradient(ellipse 120% 80% at 50% 20%, #1E50A2 0%, #0d1f3c 40%, #0B1528 100%)',
        color: '#ffffff',
        maxWidth: '390px',
        margin: '0 auto',
      }}
    >
      <GridLines />
      <GlowOrb />

      {/* Top Banner */}
      <div
        style={{
          background: '#1E50A2',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          position: 'relative',
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#7dd3fc',
            flexShrink: 0,
          }}
        />
        <p
          style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.92)',
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          Linko - Aligning Businesses, Multiplying Success.
        </p>
        <ArrowRight size={11} color="rgba(255,255,255,0.7)" />
      </div>

      {/* Sticky Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          padding: '0 20px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: 'rgba(11,21,40,0.72)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <SuiLogo />
          <span
            style={{
              fontSize: '17px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            Linko
          </span>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            style={{
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.01em',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#2563eb')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#3b82f6')}
          >
            Get started
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
              transition: 'background 0.2s ease',
            }}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            background: 'rgba(11,21,40,0.98)',
            backdropFilter: 'blur(24px)',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
            <button
              onClick={() => setMenuOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ffffff',
              }}
            >
              <X size={20} />
            </button>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {['Developers', 'Ecosystem', 'Learn', 'Blog', 'Help'].map((item) => (
              <button
                key={item}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: '28px',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  textAlign: 'left',
                  padding: '10px 0',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
              >
                {item}
              </button>
            ))}
          </nav>
          <div style={{ marginTop: 'auto', paddingBottom: '40px' }}>
            <button
              style={{
                width: '100%',
                background: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Get started →
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '64px 24px 48px',
          textAlign: 'center',
          minHeight: 'calc(100vh - 100px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Eyebrow badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '100px',
            padding: '6px 14px',
            marginBottom: '36px',
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#3b82f6',
              boxShadow: '0 0 8px #3b82f6',
            }}
          />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#7dd3fc',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            AI BUSINESS PLATFORM
          </span>
        </div>

        {/* Main heading */}
        <h1
          style={{
            fontSize: '56px',
            fontWeight: 900,
            lineHeight: 1.0,
            letterSpacing: '-0.04em',
            marginBottom: '24px',
            maxWidth: '340px',
          }}
        >
          <span style={{ display: 'block', color: '#ffffff' }}>Run your entire</span>
          <span
            style={{
              display: 'block',
              color: 'transparent',
              background:
                'linear-gradient(135deg, #60a5fa 0%, #ffffff 50%, rgba(255,255,255,0.35) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              filter: 'blur(0px)',
              position: 'relative',
            }}
          >
            Business
            {/* Blur fade overlay on "stack" */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, transparent 0%, transparent 55%, rgba(11,21,40,0.6) 100%)',
                pointerEvents: 'none',
              }}
            />
          </span>
        </h1>

        {/* Subheadline */}
        <p
          style={{
            fontSize: '16px',
            fontWeight: 400,
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.55)',
            maxWidth: '280px',
            marginBottom: '48px',
            letterSpacing: '0.01em',
          }}
        >
          Manage operations, automate workflows, and connect with trusted business partners — all in
          one AI-powered platform.
        </p>

        {/* CTA Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            width: '100%',
            maxWidth: '320px',
          }}
        >
          <button
            style={{
              flex: 1,
              background: '#0B1528',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: '12px',
              padding: '15px 20px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
              e.currentTarget.style.background = '#0B1528';
            }}
          >
            <ExternalLink size={14} color="rgba(255,255,255,0.6)" />
            Get started
          </button>
          <button
            style={{
              flex: 1,
              background: '#ffffff',
              color: '#0B1528',
              border: 'none',
              borderRadius: '12px',
              padding: '15px 20px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.2s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e0ecff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            Log in
          </button>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: '0',
            width: '100%',
            maxWidth: '320px',
            marginTop: '64px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            paddingTop: '32px',
          }}
        >
          {[
            { value: 'Manage', label: 'Smart Management' },
            { value: 'Connect', label: 'Business Network' },
            { value: 'Automate', label: 'AI Assistance' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                textAlign: 'center',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}
            >
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: '#ffffff',
                  lineHeight: 1.1,
                  marginBottom: '4px',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.38)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Features pill row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '40px',
            justifyContent: 'center',
            maxWidth: '320px',
          }}
        >
          {['CRM', 'Analytics', 'Business Network', 'Workflow', 'Projects'].map((feat) => (
            <span
              key={feat}
              style={{
                background: 'rgba(30,80,162,0.25)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '100px',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.6)',
                letterSpacing: '0.02em',
              }}
            >
              {feat}
            </span>
          ))}
        </div>
      </main>

      {/* Bottom scroll indicator */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          paddingBottom: '32px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <div
            style={{
              width: '1px',
              height: '32px',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)',
            }}
          />
          <span
            style={{
              fontSize: '10px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Scroll
          </span>
        </div>
      </div>
    </div>
  );
}
