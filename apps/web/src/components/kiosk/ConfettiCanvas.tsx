"use client";

import { useEffect, useRef } from "react";

interface ConfettiCanvasProps {
  active: boolean;
  type?: "BIRTHDAY" | "PUNCTUAL" | "STANDARD";
}

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  opacity: number;
  shape: "rect" | "circle" | "star";
}

export function ConfettiCanvas({ active, type = "STANDARD" }: ConfettiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Color palettes
    const birthdayColors = ["#f59e0b", "#ec4899", "#8b5cf6", "#a3e635", "#38bdf8", "#f43f5e", "#fbbf24"];
    const punctualColors = ["#a3e635", "#4ade80", "#22d3ee", "#38bdf8", "#fbbf24"];
    const colors = type === "BIRTHDAY" ? birthdayColors : punctualColors;

    const particleCount = type === "BIRTHDAY" ? 140 : 80;
    const particles: Particle[] = [];

    // Spawn burst particles from two bottom sides and center
    for (let i = 0; i < particleCount; i++) {
      const isLeft = i % 2 === 0;
      const originX = isLeft ? width * 0.15 + (Math.random() * width * 0.1) : width * 0.85 - (Math.random() * width * 0.1);
      const angle = isLeft ? (Math.random() * 0.6 + 0.2) * -Math.PI : (Math.random() * 0.6 + 0.2) * -Math.PI + Math.PI;
      const speed = Math.random() * 16 + 8;

      particles.push({
        x: originX,
        y: height * 0.9,
        w: Math.random() * 10 + 6,
        h: Math.random() * 12 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: Math.cos(angle) * speed * (isLeft ? 1 : -1) + (Math.random() - 0.5) * 4,
        vy: -Math.abs(Math.sin(angle) * speed) - Math.random() * 5,
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12,
        opacity: 1,
        shape: type === "BIRTHDAY" && Math.random() > 0.6 ? "star" : Math.random() > 0.5 ? "circle" : "rect",
      });
    }

    let animId: number;
    let startTime = Date.now();

    const drawStar = (cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
    };

    const animate = () => {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, width, height);

      let aliveCount = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Physics
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28; // Gravity
        p.vx *= 0.985; // Air friction
        p.rotation += p.vr;

        // Fade out towards end of 4.5s
        if (elapsed > 2500) {
          p.opacity = Math.max(0, p.opacity - 0.015);
        }

        if (p.opacity > 0 && p.y < height + 40) {
          aliveCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;

          if (p.shape === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.shape === "star") {
            drawStar(0, 0, 5, p.w, p.w / 2);
          } else {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          }

          ctx.restore();
        }
      }

      if (aliveCount > 0 && elapsed < 5500) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [active, type]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-40 w-full h-full"
    />
  );
}
