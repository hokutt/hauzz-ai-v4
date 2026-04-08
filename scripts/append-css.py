animations = """
/* HAUZZ.AI V4 Custom Animations & Utilities */
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-18px) rotate(1deg); }
  66% { transform: translateY(-8px) rotate(-1deg); }
}
@keyframes float-slow {
  0%, 100% { transform: translateY(0px) translateX(0px); }
  25% { transform: translateY(-12px) translateX(6px); }
  50% { transform: translateY(-20px) translateX(-4px); }
  75% { transform: translateY(-8px) translateX(8px); }
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px 4px oklch(0.72 0.22 340 / 0.4); }
  50% { box-shadow: 0 0 40px 12px oklch(0.72 0.22 340 / 0.7), 0 0 80px 20px oklch(0.65 0.20 280 / 0.3); }
}
@keyframes twinkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.2; transform: scale(0.6); }
}
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes drift {
  0% { transform: translateX(0) translateY(0); }
  25% { transform: translateX(10px) translateY(-5px); }
  50% { transform: translateX(5px) translateY(10px); }
  75% { transform: translateX(-8px) translateY(3px); }
  100% { transform: translateX(0) translateY(0); }
}
@keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
@keyframes nebula-drift {
  0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.6; }
  33% { transform: scale(1.05) translate(-1%, 1%); opacity: 0.8; }
  66% { transform: scale(0.97) translate(1%, -1%); opacity: 0.5; }
}
@keyframes fade-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-in-right { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
@keyframes orbit {
  from { transform: rotate(0deg) translateX(var(--orbit-r, 140px)) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(var(--orbit-r, 140px)) rotate(-360deg); }
}
.animate-float { animation: float 6s ease-in-out infinite; }
.animate-float-slow { animation: float-slow 10s ease-in-out infinite; }
.animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
.animate-twinkle { animation: twinkle 2s ease-in-out infinite; }
.animate-shimmer { animation: shimmer 3s linear infinite; }
.animate-drift { animation: drift 15s ease-in-out infinite; }
.animate-spin-slow { animation: spin-slow 30s linear infinite; }
.animate-spin-reverse { animation: spin-reverse 20s linear infinite; }
.animate-nebula-drift { animation: nebula-drift 20s ease-in-out infinite; }
.animate-fade-up { animation: fade-up 0.8s ease-out forwards; }
.animate-fade-in { animation: fade-in 1s ease-out forwards; }
.animate-slide-in-right { animation: slide-in-right 0.6s ease-out forwards; }
.text-gradient-pink {
  background: linear-gradient(135deg, oklch(0.90 0.14 340), oklch(0.72 0.22 340), oklch(0.65 0.20 280));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.text-gradient-cosmic {
  background: linear-gradient(135deg, oklch(0.90 0.12 60), oklch(0.85 0.18 340), oklch(0.78 0.20 200));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  background-size: 200% auto;
  animation: shimmer 4s linear infinite;
}
.glass {
  background: oklch(0.10 0.03 300 / 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid oklch(0.72 0.22 340 / 0.15);
}
.glass-strong {
  background: oklch(0.08 0.03 300 / 0.85);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid oklch(0.72 0.22 340 / 0.25);
}
.glow-pink { box-shadow: 0 0 20px oklch(0.72 0.22 340 / 0.5), 0 0 60px oklch(0.72 0.22 340 / 0.2); }
.glow-cyan { box-shadow: 0 0 20px oklch(0.78 0.20 200 / 0.5), 0 0 60px oklch(0.78 0.20 200 / 0.2); }
.text-glow-pink { text-shadow: 0 0 20px oklch(0.72 0.22 340 / 0.8), 0 0 40px oklch(0.72 0.22 340 / 0.4); }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: oklch(0.08 0.03 300); }
::-webkit-scrollbar-thumb { background: oklch(0.72 0.22 340 / 0.5); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: oklch(0.72 0.22 340 / 0.8); }
"""

with open('/home/ubuntu/hauzz-ai-v4/client/src/index.css', 'a') as f:
    f.write(animations)
print('CSS animations appended successfully')
