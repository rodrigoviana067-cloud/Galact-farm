// App.tsx - Galactic Farm Elite Edition - Sistema Completo com Minijogo
import {
  TonConnectButton,
  TonConnectUIProvider,
  useTonAddress,
  useTonConnectUI,
} from "@tonconnect/ui-react";
import WebApp from "@twa-dev/sdk";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Address, toNano, beginCell } from "@ton/core";

// ==================== TIPOS ADSGRAM ====================
declare global {
  interface Window {
    Adsgram?: {
      init: (params: { blockId: string; debug?: boolean; debugBannerType?: number }) => AdsgramController;
    };
    conversaoRecente?: boolean;
  }
}

interface AdsgramController {
  show: () => Promise<void>;
}

// ==================== CONFIGURAÇÕES ====================
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://fazendareal-final.vercel.app';
const MIN_WITHDRAW = Number(process.env.REACT_APP_MIN_WITHDRAW) || 50.0;
const LOCK_TIME_MS = Number(process.env.REACT_APP_LOCK_TIME_MS) || 60000;
const TAXA_SAQUE_PERCENTUAL = 0.10;

const DICAS = [
  "💡 As sementes raras dão mais lucro! Invista em Gêmea Cristalina!",
  "💡 Use o boost 2x para acelerar colheitas demoradas!",
  "💡 Complete missões diárias todos os dias para recompensas máximas!",
  "🚀 Faça staking de TERRA para ganhar bônus passivos!",
  "⚡ A Roleta pode dar prêmios valiosos! Tente sua sorte!",
  "🎯 Slots aprimorados geram +1% de lucro por nível!",
  "💎 Guarde TERRA no stake para desbloquear tiers exclusivos!",
  "🏆 O Ranking Global mostra os melhores fazendeiros da galáxia!",
  "🐔 Compre animais na loja e colete ovos, leite e lã!",
  "💰 Venda animais usados para recuperar tickets e reinvestir!",
  "⚠️ Não feche o app durante plantações! O progresso será perdido!",
  "🎮 O Clicker é complementar - não deixe de plantar na fazenda!",
];

const CONFIG = {
  TAXA_TICKET_PARA_TERRA: 100000,
  TAXA_TERRA_PARA_TICKET: 80000,
  MIN_SAQUE_TERRA: MIN_WITHDRAW,
  ADSGRAM_ID: "22010",

  MIN_COMPRA_TERRA: 100,
  TAXA_COMPRA_TON: 0.01,

  // CONFIGURAÇÕES DO MINIJOGOS CLICKER
  CLICKER: {
    LIMITE_CLIQUES_POR_SEGUNDO: 8,
    INTERVALO_ANUNCIO_CLIQUES: 50, // A cada 50 cliques
    COOLDOWN_ANUNCIO_REWARDED: 300000, // 5 minutos entre anúncios rewarded
    LIMITE_DIARIO_TERRA: 10, // Máximo 5 TERRA por dia no clicker
    REDUCAO_PROGRESSIVA_APOS: 100, // Após 100 cliques, reduz chance
    MULTIPLICADOR_COMBO_5: 0.10, // +10% chance
    MULTIPLICADOR_COMBO_10: 0.20, // +20% chance
    MULTIPLICADOR_COMBO_20: 0.35, // +35% chance máximo
  },

  DADOS_TERRENO: [
    { preco: 0, nivelReq: 1 }, 
    { preco: 0, nivelReq: 1 }, 
    { preco: 5000, nivelReq: 3 },
    { preco: 15000, nivelReq: 5 }, 
    { preco: 50000, nivelReq: 8 }, 
    { preco: 100000, nivelReq: 12 },
    { preco: 250000, nivelReq: 15 }, 
    { preco: 500000, nivelReq: 20 }, 
    { preco: 1000000, nivelReq: 25 },
  ],
  
  RECOMPENSAS: [
    { dia: 1, xp: 150, tkt: 1000, item: "PLASMA" },
    { dia: 2, xp: 300, tkt: 2500, item: "PLASMA" },
    { dia: 3, xp: 600, tkt: 5000, item: "CORN" },
    { dia: 4, xp: 1200, tkt: 10000, item: "CORN" },
    { dia: 5, xp: 2500, tkt: 20000, item: "TOMATO" },
    { dia: 6, xp: 5000, tkt: 50000, item: "VOID" },
    { dia: 7, xp: 15000, tkt: 200000, item: "CRYSTAL" },
  ],
  
  // SEMENTES DO MINIJOGOS - ECONOMIA BALANCEADA
    SEMENTES_CLICKER: {
    PLASMA: { 
      nome: "Cósmica", 
      precoTerra: 0.1, 
      icone: "🌌", 
      tempo: 60, 
      chanceBase: 0.05,
      drops: {
        semente: { chance: 0.50, tipo: "PLASMA", qtd: 1 },
        ticket: { chance: 0.03, qtd: 1 },
        terra: { chance: 0.015, min: 1, max: 2 }
      },
      color: "#818cf8", 
      desc: "Chance baixa, drops básicos" 
    },
    CORN: { 
      nome: "Milho", 
      precoTerra: 0.5, 
      icone: "🌽", 
      tempo: 120, 
      chanceBase: 0.08,
      drops: {
        semente: { chance: 0.25, tipo: "CORN", qtd: 1 },
        ticket: { chance: 0.04, qtd: 2 },
        terra: { chance: 0.02, min: 1, max: 2 }
      },
      color: "#fbbf24", 
      desc: "Chance média, drops melhores" 
    },
    TOMATO: { 
      nome: "Tomate", 
      precoTerra: 1.0, 
      icone: "🍅", 
      tempo: 180, 
      chanceBase: 0.10,
      drops: {
        semente: { chance: 0.15, tipo: "TOMATO", qtd: 1 },
        ticket: { chance: 0.05, qtd: 3 },
        terra: { chance: 0.025, min: 1, max: 3 }
      },
      color: "#f87171", 
      desc: "Boa chance, drops valiosos" 
    },
    VOID: { 
      nome: "Void", 
      precoTerra: 2.5, 
      icone: "🔱", 
      tempo: 300, 
      chanceBase: 0.15,
      drops: {
        semente: { chance: 0.07, tipo: "VOID", qtd: 1 },
        ticket: { chance: 0.06, qtd: 5 },
        terra: { chance: 0.03, min: 2, max: 3 }
      },
      color: "#a855f7", 
      desc: "Alta chance, drops raros" 
    },
    CRYSTAL: { 
      nome: "Gêmea Cristalina", 
      precoTerra: 5.0, 
      icone: "💎", 
      tempo: 600, 
      chanceBase: 0.20,
      drops: {
        semente: { chance: 0.03, tipo: "CRYSTAL", qtd: 1 },
        ticket: { chance: 0.08, qtd: 10 },
        terra: { chance: 0.04, min: 2, max: 3 }
      },
      color: "#22d3ee", 
      desc: "Máxima chance, drops épicos" 
    },
  },

    LOJA: {
    PLASMA: { nome: "Cósmica", precoTerra: 0, precoTickets: 0, isAd: true, icone: "🌌", tempo: 60, lucro: 2500, xp: 15, energia: 15, color: "#818cf8", gradient: "linear-gradient(135deg, #818cf8, #6366f1)", desc: "Cresce em 1 minuto" },
    CORN: { nome: "Milho", precoTerra: 0, precoTickets: 7500, isAd: false, icone: "🌽", tempo: 300, lucro: 20000, xp: 60, energia: 40, color: "#fbbf24", gradient: "linear-gradient(135deg, #fbbf24, #f59e0b)", desc: "Cresce em 5 minutos" },
    TOMATO: { nome: "Tomate", precoTerra: 0.2, precoTickets: 0, isAd: false, icone: "🍅", tempo: 900, lucro: 50000, xp: 250, energia: 60, color: "#f87171", gradient: "linear-gradient(135deg, #f87171, #ef4444)", desc: "Cresce em 15 minutos" },
    VOID: { nome: "Void", precoTerra: 0.8, precoTickets: 0, isAd: false, icone: "🔱", tempo: 1800, lucro: 150000, xp: 1200, energia: 80, color: "#a855f7", gradient: "linear-gradient(135deg, #a855f7, #7c3aed)", desc: "Cresce em 30 minutos" },
    CRYSTAL: { nome: "Gêmea Cristalina", precoTerra: 2.5, precoTickets: 0, isAd: false, icone: "💎", tempo: 7200, lucro: 600000, xp: 5000, energia: 95, color: "#22d3ee", gradient: "linear-gradient(135deg, #22d3ee, #06b6d4)", desc: "Cresce em 2 horas" },
  },

  // ANIMAIS ATUALIZADOS COM 2 NOVOS
    ANIMAIS: {
    GALINHA: { nome: "Galinha", icone: "🐔", preco: 30, tempoProducao: 30 * 60 * 1000, produto: "ovo", produtoIcone: "🥚", valorProduto: 75000, desc: "Produz ovos a cada 30min", valorVenda: 45000 },
    VACA: { nome: "Vaca", icone: "🐮", preco: 100, tempoProducao: 60 * 60 * 1000, produto: "leite", produtoIcone: "🥛", valorProduto: 300000, desc: "Produz leite a cada 1h", valorVenda: 180000 },
    OVELHA: { nome: "Ovelha", icone: "🐑", preco: 120, tempoProducao: 2 * 60 * 60 * 1000, produto: "lã", produtoIcone: "🧶", valorProduto: 450000, desc: "Produz lã a cada 2h", valorVenda: 270000 },
    CABRA: { 
      nome: "Cabra Nebulosa", 
      icone: "🐐", 
      preco: 300, 
      tempoProducao: 10 * 60 * 1000, 
      produto: "leite_nebuloso", 
      produtoIcone: "🥛✨", 
      valorProduto: 750000, 
      desc: "Produz leite nebuloso a cada 10min", 
      valorVenda: 450000,
      tier: "Intermediário+"
    },
    DRAGAO: { 
      nome: "Dragão Rural Cósmico", 
      icone: "🐉", 
      preco: 800, 
      tempoProducao: 25 * 60 * 1000, 
      produto: "essencia_estelar", 
      produtoIcone: "⭐", 
      valorProduto: 1500000, 
      desc: "Produz essência estelar a cada 25min", 
      valorVenda: 900000,
      tier: "Endgame"
    },
  },

    STAKING_TIERS: [
    { amount: 100, xpBonus: 0.05, ticketBonus: 0.02, nome: "Bronze", color: "#cd7f32", icon: "🥉", glow: "0 0 20px rgba(205,127,50,0.5)" },
    { amount: 500, xpBonus: 0.12, ticketBonus: 0.08, nome: "Prata", color: "#c0c0c0", icon: "🥈", glow: "0 0 25px rgba(192,192,192,0.6)" },
    { amount: 2000, xpBonus: 0.25, ticketBonus: 0.15, nome: "Ouro", color: "#ffd700", icon: "🥇", glow: "0 0 30px rgba(255,215,0,0.7)" },
    { amount: 5000, xpBonus: 0.40, ticketBonus: 0.25, nome: "Platina", color: "#e5e4e2", icon: "💎", glow: "0 0 35px rgba(229,228,226,0.8)" },
    { amount: 10000, xpBonus: 0.60, ticketBonus: 0.40, nome: "Cosmic", color: "#a855f7", icon: "🌌", glow: "0 0 40px rgba(168,85,247,0.9)" },
  ],
  
    FORGE_COSTS: [
    { cost: 5, chance: 1.0, color: "#6b7280" }, 
    { cost: 10, chance: 0.8, color: "#10b981" },
    { cost: 25, chance: 0.6, color: "#3b82f6" }, 
    { cost: 50, chance: 0.4, color: "#8b5cf6" },
    { cost: 100, chance: 0.2, color: "#f59e0b" },
  ],
  FORGE_BONUS_PER_LEVEL: 0.01,
  
  ROLETA_PREMIOS: [
    { tipo: "PLASMA", quantidade: 5, peso: 35, icon: "🌌", color: "#818cf8", nome: "Semente Cósmica", valor: 0, emoji: "🌌", desc: "Plante imediatamente" },
    { tipo: "CORN", quantidade: 3, peso: 25, icon: "🌽", color: "#fbbf24", nome: "Milho Dourado", valor: 0.05, emoji: "🌽", desc: "Lucro rápido" },
    { tipo: "TOMATO", quantidade: 2, peso: 15, icon: "🍅", color: "#f87171", nome: "Tomate Rubi", valor: 0.15, emoji: "🍅", desc: "Bom valor" },
    { tipo: "VOID", quantidade: 1, peso: 8, icon: "🔱", color: "#a855f7", nome: "Void Essence", valor: 0.50, emoji: "🔱", desc: "Raro e valioso" },
    { tipo: "CRYSTAL", quantidade: 1, peso: 5, icon: "💎", color: "#22d3ee", nome: "Gêmea Cristalina", valor: 1.00, emoji: "💎", desc: "Muito raro!" },
    { tipo: "TERRA", quantidade: 0.5, peso: 8, icon: "💎", color: "#22d3ee", nome: "0.5 TERRA", valor: 0.50, emoji: "💎", isCoin: true, desc: "Direto na carteira" },
    { tipo: "TERRA", quantidade: 1, peso: 3, icon: "💎", color: "#22d3ee", nome: "1 TERRA", valor: 1.00, emoji: "💎", isCoin: true, destaque: true, desc: "Jackpot!" },
    { tipo: "TICKETS", quantidade: 50000, peso: 1, icon: "🎟️", color: "#fbbf24", nome: "50K Tickets", valor: 0.25, emoji: "🎟️", desc: "Compre mais sementes" },
  ],
  
  ROLETA_CUSTO_TERRA: 0.2,
  ROLETA_MAX_GIRADOS_HOJE: 5,
  
  MELHORES_STAKERS: [
    { nome: "CryptoKing", amount: 1250, tier: "Cosmic" },
    { nome: "StarFarmer", amount: 890, tier: "Platina" },
    { nome: "VoidWalker", amount: 520, tier: "Platina" },
    { nome: "Luna", amount: 380, tier: "Ouro" },
    { nome: "Solaris", amount: 210, tier: "Ouro" },
    { nome: "Nebula", amount: 150, tier: "Prata" },
    { nome: "Comet", amount: 95, tier: "Prata" },
    { nome: "Galaxy", amount: 45, tier: "Bronze" },
  ],

  AVISOS: {
    COMPRA: "⚠️ Mínimo de 20 TERRA por compra (devido às taxas da rede). Compras menores consomem mais em taxa do que em token.",
    SAQUE: "💰 Saque mínimo: 5 TERRA (taxa de 10%).",
    STAKING: "⚡ Faça stake de TERRA para ganhar até 60% de bônus em todas as colheitas!",
  }
};

// ==================== ESTILOS ====================
const KEYFRAMES_CSS = `
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(34, 211, 238, 0.4); }
      50% { box-shadow: 0 0 40px rgba(34, 211, 238, 0.8); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes bounce-in {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes plant-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }
    @keyframes glow-pulse {
      0%, 100% { filter: drop-shadow(0 0 20px currentColor); }
      50% { filter: drop-shadow(0 0 40px currentColor); }
    }
    @keyframes particle-float {
      0% { transform: translate(0, 0) scale(1); opacity: 1; }
      100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
    }
  `;

const STYLES: { [key: string]: React.CSSProperties } = {
  container: {
    background: "linear-gradient(135deg, #0a0f1a 0%, #1a1f3d 50%, #0f172a 100%)",
    color: "#f8fafc",
    minHeight: "100vh",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    paddingBottom: "90px",
    position: "relative",
    overflowX: "hidden",
  },
  bgGlow: {
    position: "fixed",
    top: "20%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "600px",
    height: "600px",
    background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  glass: {
    background: "linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "24px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    position: "relative",
    zIndex: 1,
  },
  glassPremium: {
    background: "linear-gradient(145deg, rgba(139, 92, 246, 0.15), rgba(124, 58, 237, 0.1))",
    backdropFilter: "blur(20px)",
    borderRadius: "24px",
    border: "2px solid rgba(139, 92, 246, 0.3)",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 0 40px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
    position: "relative",
    overflow: "hidden",
  },
  buttonPrimary: {
    background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)",
    border: "none",
    color: "#fff",
    padding: "16px 24px",
    borderRadius: "16px",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 10px 30px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
    width: "100%",
    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
    letterSpacing: "0.5px",
  },
  buttonSecondary: {
    background: "linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "12px",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    backdropFilter: "blur(10px)",
  },
  statCard: {
    background: "linear-gradient(145deg, rgba(51, 65, 85, 0.6), rgba(30, 41, 59, 0.8))",
    borderRadius: "20px",
    padding: "16px",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  roletaContainer: {
    position: "relative",
    width: "280px",
    height: "280px",
    margin: "0 auto 24px",
    borderRadius: "50%",
    background: "conic-gradient(from 0deg, #1e293b, #0f172a, #1e293b)",
    boxShadow: "0 0 60px rgba(139, 92, 246, 0.3), inset 0 0 40px rgba(0,0,0,0.6)",
    border: "8px solid #1e293b",
  },
  roletaOuterRing: {
    position: "absolute",
    inset: "-4px",
    borderRadius: "50%",
    background: "conic-gradient(from 0deg, #8b5cf6, #22d3ee, #fbbf24, #ef4444, #8b5cf6)",
    opacity: 0.3,
    filter: "blur(8px)",
  },
  roletaCenter: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "linear-gradient(145deg, #0f172a, #1e293b)",
    border: "4px solid #8b5cf6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "36px",
    zIndex: 10,
    boxShadow: "0 0 30px rgba(139, 92, 246, 0.6), inset 0 2px 4px rgba(255,255,255,0.1)",
  },
  roletaPointer: {
    position: "absolute",
    top: "-20px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "0",
    height: "0",
    borderLeft: "16px solid transparent",
    borderRight: "16px solid transparent",
    borderTop: "28px solid #ef4444",
    filter: "drop-shadow(0 0 15px rgba(239, 68, 68, 0.9))",
    zIndex: 20,
  },
  farmSlot: {
    background: "linear-gradient(145deg, rgba(51, 65, 85, 0.4), rgba(30, 41, 59, 0.6))",
    borderRadius: "20px",
    padding: "16px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
    aspectRatio: "1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)",
  },
  farmSlotReady: {
    background: "linear-gradient(145deg, rgba(34, 211, 238, 0.2), rgba(6, 182, 212, 0.3))",
    border: "2px solid #22d3ee",
    boxShadow: "0 0 30px rgba(34, 211, 238, 0.4)",
    animation: "pulse-glow 2s infinite",
  },
  progressBar: {
    height: "8px",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "4px",
    overflow: "hidden",
    position: "relative",
  },
  progressFill: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.5s ease",
    position: "relative",
    overflow: "hidden",
  },
  // ESTILOS DO MINIJOGOS CLICKER
  clickerContainer: {
    position: "fixed",
    inset: 0,
    background: "linear-gradient(135deg, #0a0f1a 0%, #1a1f3d 50%, #0f172a 100%)",
    zIndex: 2000,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  clickerPlant: {
    width: "200px",
    height: "200px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "100px",
    cursor: "pointer",
    transition: "transform 0.1s ease, filter 0.3s ease",
    userSelect: "none",
    position: "relative",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  clickerComboBar: {
    position: "absolute",
    bottom: "100px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "200px",
    height: "8px",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "4px",
    overflow: "hidden",
  },
  clickerComboFill: {
    height: "100%",
    background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
    transition: "width 0.2s ease",
    boxShadow: "0 0 10px #fbbf24",
  },
  floatingButton: {
    position: "fixed",
    bottom: "100px",
    right: "20px",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
    border: "none",
    color: "#fff",
    fontSize: "24px",
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(139, 92, 246, 0.5)",
    zIndex: 90,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  transactionHistory: {
    position: "fixed",
    top: 0,
    right: 0,
    width: "100%",
    maxWidth: "400px",
    height: "100%",
    background: "linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))",
    backdropFilter: "blur(20px)",
    zIndex: 2000,
    transform: "translateX(100%)",
    transition: "transform 0.3s ease",
    overflowY: "auto",
    padding: "20px",
  },
  transactionHistoryOpen: {
    transform: "translateX(0)",
  },

};

// ==================== HOOK ADSGRAM ====================
function useAdsGram() {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const adControllerRef = useRef<AdsgramController | null>(null);

  useEffect(() => {
    const initAdsGram = () => {
      if ((window as any).Adsgram) {
        try {
          adControllerRef.current = (window as any).Adsgram.init({
            blockId: CONFIG.ADSGRAM_ID,
            debug: false,
          });
          setIsReady(true);
          console.log("✅ AdsGram inicializado! Block ID:", CONFIG.ADSGRAM_ID);
        } catch (error) {
          console.error("❌ Erro ao inicializar AdsGram:", error);
        }
      } else {
        console.log("⏳ Aguardando AdsGram...");
        setTimeout(initAdsGram, 500);
      }
    };
    setTimeout(initAdsGram, 1000);
  }, []);

  const showAd = useCallback(async (onReward: () => void, onError?: (error?: any) => void): Promise<boolean> => {
    if (!adControllerRef.current) {
      console.error("AdsGram não está pronto");
      onError?.();
      return false;
    }

    setIsLoading(true);

    try {
      await adControllerRef.current.show();
      console.log("✅ Anúncio completado!");
      onReward();
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("❌ Erro no anúncio:", error);
      onError?.(error);
      setIsLoading(false);
      return false;
    }
  }, []);

  const showInterstitial = useCallback(async (): Promise<boolean> => {
    if (!isReady) {
      console.log("AdsGram não está pronto");
      return false;
    }

    try {
      const adsgram = (window as any).Adsgram;
      await adsgram.init({ blockId: "int-23120" }).show();
      console.log("✅ Anúncio intersticial exibido");
      return true;
    } catch (error) {
      console.log("❌ Erro ou nenhum anúncio disponível");
      return false;
    }
  }, [isReady]);

  return { showAd, showInterstitial, isReady, isLoading };
}

// ==================== COMPONENTE PRINCIPAL ====================
function GameComponent() {
  const [isReady, setIsReady] = useState(false);
  const wallet = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const [aba, setAba] = useState("fazenda");
  
  const { showAd, showInterstitial, isReady: adsReady, isLoading: adLoading } = useAdsGram();
  
  const [tickets, setTickets] = useState(5000);
  const [terraToken, setTerraToken] = useState(0.0);
  const [nivel, setNivel] = useState(1);
  const [xp, setXp] = useState(0);
  const [energia, setEnergia] = useState(100);
  
  const [levelBar, setLevelBar] = useState({ atual: 0, maximo: 100 });
  const [energiaBar, setEnergiaBar] = useState({ atual: 100, maximo: 100 });
  
  const [inv, setInv] = useState<{ [key: string]: number }>({ PLASMA: 10, CORN: 0, TOMATO: 0, VOID: 0, CRYSTAL: 0 });
  const [slots, setSlots] = useState([true, true, true, false, false, false, false, false, false]);
  const [fazenda, setFazenda] = useState(Array.from({ length: 9 }, (_, i) => ({ 
    id: i, status: "vazio", tempo: 0, tempoTotal: 0, tipo: "", plantadoEm: null as number | null, crescimento: 0
  })));
  
  const [animais, setAnimais] = useState<any[]>([]);
  const [produtosAnimais, setProdutosAnimais] = useState<{[key: string]: number}>({
    ovo: 0,
    leite: 0,
    "lã": 0,
    leite_nebuloso: 0,
    essencia_estelar: 0,
  });
  
  const [selSlot, setSelSlot] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [slotParaColeta, setSlotParaColeta] = useState<any | null>(null);
  const [slotLevels, setSlotLevels] = useState(Array(9).fill(0));
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  const [terraStaked, setTerraStaked] = useState(0);
  const [stakingRewards, setStakingRewards] = useState(0);
  const [lastStakingClaim, setLastStakingClaim] = useState<number>(Date.now());
  
  const [showDaily, setShowDaily] = useState(false);
  const [dailyRewards, setDailyRewards] = useState(CONFIG.RECOMPENSAS.map(r => ({...r, coletado: false})));
  const [tempoResetDiario, setTempoResetDiario] = useState("00:00");
  const [lastDailyClick, setLastDailyClick] = useState<number>(0);
  const [currentDailyDay, setCurrentDailyDay] = useState<number | null>(null);
  const [showDailyAd, setShowDailyAd] = useState(false);
  
  const [aceleradorAtivo, setAceleradorAtivo] = useState(false);
  const [tempoAcelerador, setTempoAcelerador] = useState(0);
  
  const [userId, setUserId] = useState<number | null>(null);
  const [loadingSaque, setLoadingSaque] = useState(false);
  const [lastWithdrawTime, setLastWithdrawTime] = useState<number>(0);
  const [ultimoSaque, setUltimoSaque] = useState<string | null>(null);
  const [saquesHoje, setSaquesHoje] = useState(0);
  
  const [showRoleta, setShowRoleta] = useState(false);
  const [giroAtivo, setGiroAtivo] = useState(false);
  const [premioRoleta, setPremioRoleta] = useState<any>(null);
  const [girosHoje, setGirosHoje] = useState(0);
  const [ultimoGiroGratis, setUltimoGiroGratis] = useState<number>(0);
  const [tempoProximoGiro, setTempoProximoGiro] = useState<string>("");
  const [roletaRotation, setRoletaRotation] = useState(0);
  const [highlightedItem, setHighlightedItem] = useState<number | null>(null);
  const [showRoletaAd, setShowRoletaAd] = useState(false);
  const [giroGratuitoDisponivel, setGiroGratuitoDisponivel] = useState(true);
  
  // ESTADOS DO MINIJOGOS CLICKER
  const [showClicker, setShowClicker] = useState(false);
  const [showClickerSeedModal, setShowClickerSeedModal] = useState(false);
  const [clickerSeed, setClickerSeed] = useState<string | null>(null);
  const [clickerClicks, setClickerClicks] = useState(0);
  const [clickerCombo, setClickerCombo] = useState(0);
  const [clickerLastClick, setClickerLastClick] = useState(0);
  const [clickerTerraGanhoHoje, setClickerTerraGanhoHoje] = useState(0);
  const [clickerUltimoReset, setClickerUltimoReset] = useState<number>(Date.now());
  const [clickerRewardedActive, setClickerRewardedActive] = useState(false);
  const [clickerRewardedTimeLeft, setClickerRewardedTimeLeft] = useState(0);
  const [clickerCooldownAd, setClickerCooldownAd] = useState(0);
  const [clickerParticles, setClickerParticles] = useState<Array<{id: number, x: number, y: number, emoji: string, color: string}>>([]);
  
  // ESTADOS DO HISTÓRICO DE TRANSAÇÕES
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [transactions, setTransactions] = useState<Array<{
    id: string;
    tipo: 'compra' | 'venda' | 'drop' | 'anuncio' | 'ganho' | 'saque' | 'staking';
    descricao: string;
    valor: string;
    data: string;
  }>>([]);
  
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, color: string}>>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);

  const roletaRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const xpNec = useMemo(() => Math.floor(800 * Math.pow(nivel, 1.6)), [nivel]);
  
  const currentStakingTier = useMemo(() => {
    for (let i = CONFIG.STAKING_TIERS.length - 1; i >= 0; i--) {
      if (terraStaked >= CONFIG.STAKING_TIERS[i].amount) {
        return { ...CONFIG.STAKING_TIERS[i], index: i, nextTier: CONFIG.STAKING_TIERS[i+1] };
      }
    }
    return { ...CONFIG.STAKING_TIERS[0], index: 0, isBase: true, nextTier: CONFIG.STAKING_TIERS[1] };
  }, [terraStaked]);

  const stakingAPY = useMemo(() => terraStaked * 0.005, [terraStaked]);

  // ==================== SISTEMA DE SALVAMENTO ULTRA-AGRESSIVO ====================
  
  const saveGameInstant = useCallback(() => {
    const data = JSON.stringify({
      tickets, 
      terraToken, 
      nivel, 
      xp, 
      energia, 
      inv, 
      slots, 
      fazenda,
      terraStaked, 
      stakingRewards, 
      slotLevels, 
      dailyRewards,
      aceleradorAtivo, 
      tempoAcelerador, 
      ultimoSaque, 
      saquesHoje, 
      girosHoje,
      lastStakingClaim, 
      lastDailyClick, 
      animais, 
      produtosAnimais,
      ultimoGiroGratis,
      lastWithdrawTime,
      clickerTerraGanhoHoje,
      clickerUltimoReset,
      transactions
    });
    
    WebApp.CloudStorage.setItem("saved_game_2026_v3", data, (err) => {
      if (err) console.error("❌ Erro save cloud:", err);
      else console.log("💾 SALVO INSTANTANEAMENTE!");
    });
    
    try {
      localStorage.setItem("galactic_farm_backup", data);
    } catch (e) {
      console.log("localStorage não disponível");
    }
    
    if (userId && BACKEND_URL) {
      fetch(`${BACKEND_URL}/api/sincronizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: WebApp.initDataUnsafe?.user?.first_name || "Piloto",
          tickets,
          terraToken,
          nivel,
          xp,
          energia,
          terraStaked,
          stakingRewards,
          slotLevels,
          dailyRewards,
          girosHoje,
          lastDailyClick,
          fazenda,
          animais,
          produtosAnimais,
          clickerTerraGanhoHoje,
          transactions
        })
      }).catch(e => console.log("Erro sync:", e));
    }
  }, [tickets, terraToken, nivel, xp, energia, inv, slots, fazenda, 
      terraStaked, stakingRewards, slotLevels, dailyRewards,
      aceleradorAtivo, tempoAcelerador, ultimoSaque, saquesHoje, girosHoje,
      lastStakingClaim, lastDailyClick, userId, animais, produtosAnimais, 
      ultimoGiroGratis, lastWithdrawTime, clickerTerraGanhoHoje, clickerUltimoReset, transactions]);

  useEffect(() => {
    const interval = setInterval(() => {
      saveGameInstant();
    }, 5000);
    return () => clearInterval(interval);
  }, [saveGameInstant]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveGameInstant();
      e.preventDefault();
      e.returnValue = '';
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveGameInstant();
      }
    };
    
    const handleTouchStart = () => {
      if (saveTimeoutRef.current) return;
      saveGameInstant();
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;
      }, 2000);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('click', saveGameInstant);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('click', saveGameInstant);
    };
  }, [saveGameInstant]);

  // ==================== FUNÇÕES AUXILIARES ====================
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const createParticles = useCallback((x: number, y: number, color: string) => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() - 0.5) * 100,
      y: y + (Math.random() - 0.5) * 100,
      color
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id))), 1000);
  }, []);

  const addTransaction = useCallback((tipo: 'compra' | 'venda' | 'drop' | 'anuncio' | 'ganho' | 'saque' | 'staking', descricao: string, valor: string) => {
    const newTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tipo,
      descricao,
      valor,
      data: new Date().toISOString()
    };
    setTransactions(prev => [newTransaction, ...prev].slice(0, 10)); // Mantém últimas 100
  }, []);

  // ==================== SISTEMA DE CLIQUES DO MINIJOGOS ====================
  const processClickerDrop = useCallback(async () => {
    if (!clickerSeed) return;
    
    const seedConfig = CONFIG.SEMENTES_CLICKER[clickerSeed as keyof typeof CONFIG.SEMENTES_CLICKER];
    if (!seedConfig) return;

    // Verifica limite diário de TERRA
    if (clickerTerraGanhoHoje >= CONFIG.CLICKER.LIMITE_DIARIO_TERRA) {
      showNotification("⚠️ Limite diário de TERRA no clicker atingido!", "info");
      return;
    }

    // Calcula chance base + combo
    let chance = seedConfig.chanceBase;
    if (clickerCombo >= 20) chance += CONFIG.CLICKER.MULTIPLICADOR_COMBO_20;
    else if (clickerCombo >= 10) chance += CONFIG.CLICKER.MULTIPLICADOR_COMBO_10;
    else if (clickerCombo >= 5) chance += CONFIG.CLICKER.MULTIPLICADOR_COMBO_5;

    // Aplica boost de anúncio rewarded
    if (clickerRewardedActive) {
      chance *= 1.5; // +50% chance
    }

    // Redução progressiva após muitos cliques
    if (clickerClicks > CONFIG.CLICKER.REDUCAO_PROGRESSIVA_APOS) {
      const reducao = Math.min(0.5, (clickerClicks - CONFIG.CLICKER.REDUCAO_PROGRESSIVA_APOS) / 500);
      chance *= (1 - reducao);
    }

    const random = Math.random();
    
    if (random < chance) {
      // Determina qual drop
      const dropRandom = Math.random();
      let dropType = '';
      let dropValue = '';
      let dropIcon = '';
      
      // Prioriza tickets e sementes, TERRA é raro
      if (dropRandom < seedConfig.drops.semente.chance) {
        // Drop de semente
        const sementeTipo = seedConfig.drops.semente.tipo;
        setInv(prev => ({ ...prev, [sementeTipo]: (prev[sementeTipo] || 0) + 1 }));
        dropType = 'drop';
        dropValue = `1x ${CONFIG.LOJA[sementeTipo as keyof typeof CONFIG.LOJA]?.nome || sementeTipo}`;
        dropIcon = CONFIG.LOJA[sementeTipo as keyof typeof CONFIG.LOJA]?.icone || '🌱';
        showNotification(`🌱 +1 ${CONFIG.LOJA[sementeTipo as keyof typeof CONFIG.LOJA]?.nome || sementeTipo}!`, "success");
        addTransaction('drop', `Drop no Clicker: ${sementeTipo}`, '+1 semente');
      } else if (dropRandom < seedConfig.drops.semente.chance + seedConfig.drops.ticket.chance) {
        // Drop de ticket
        const ticketsQtd = seedConfig.drops.ticket.qtd;
        setTickets(prev => prev + ticketsQtd);
        dropType = 'ganho';
        dropValue = `${ticketsQtd} tickets`;
        dropIcon = '🎟️';
        showNotification(`🎟️ +${ticketsQtd} Tickets!`, "success");
        addTransaction('ganho', `Ganho no Clicker`, `+${ticketsQtd} tickets`);
      } else if (dropRandom < seedConfig.drops.semente.chance + seedConfig.drops.ticket.chance + seedConfig.drops.terra.chance) {
        // Drop de TERRA (controlado!)
        if (clickerTerraGanhoHoje < CONFIG.CLICKER.LIMITE_DIARIO_TERRA) {
          const terraQtd = Math.floor(Math.random() * (seedConfig.drops.terra.max - seedConfig.drops.terra.min + 1)) + seedConfig.drops.terra.min;
          const terraFinal = Math.min(terraQtd, CONFIG.CLICKER.LIMITE_DIARIO_TERRA - clickerTerraGanhoHoje);
          
          setTerraToken(prev => prev + terraFinal);
          setClickerTerraGanhoHoje(prev => prev + terraFinal);
          dropType = 'ganho';
          dropValue = `${terraFinal} TERRA`;
          dropIcon = '💎';
          showNotification(`💎 +${terraFinal} TERRA!`, "success");
          addTransaction('ganho', `Ganho no Clicker`, `+${terraFinal} TERRA`);
        }
      }

      // Cria partículas de drop
      if (dropType) {
        const particle = {
          id: Date.now(),
          x: 150 + (Math.random() - 0.5) * 100,
          y: 300 + (Math.random() - 0.5) * 100,
          emoji: dropIcon,
          color: seedConfig.color
        };
        setClickerParticles(prev => [...prev, particle]);
        setTimeout(() => {
          setClickerParticles(prev => prev.filter(p => p.id !== particle.id));
        }, 1500);
      }
    }
  }, [clickerSeed, clickerCombo, clickerClicks, clickerRewardedActive, clickerTerraGanhoHoje, showNotification, addTransaction]);

  const handleClickerClick = useCallback(() => {
    const agora = Date.now();
    const tempoDesdeUltimoClique = agora - clickerLastClick;
    
    // Anti-cheat: limite de cliques por segundo
    if (tempoDesdeUltimoClique < (1000 / CONFIG.CLICKER.LIMITE_CLIQUES_POR_SEGUNDO)) {
      return; // Ignora clique muito rápido
    }

    // Atualiza combo
    if (tempoDesdeUltimoClique < 1000) {
      setClickerCombo(prev => Math.min(prev + 1, 30));
    } else {
      setClickerCombo(0);
    }
    
    setClickerLastClick(agora);
    setClickerClicks(prev => prev + 1);

    // Verifica se deve mostrar anúncio intersticial
    if (clickerClicks > 0 && clickerClicks % CONFIG.CLICKER.INTERVALO_ANUNCIO_CLIQUES === 0) {
      showInterstitial().catch(() => {});
    }

    // Processa drop
    processClickerDrop();
  }, [clickerLastClick, clickerClicks, processClickerDrop, showInterstitial]);

  const watchAdForClickerBoost = useCallback(async () => {
    if (clickerCooldownAd > 0) {
      showNotification(`⏳ Aguarde ${Math.ceil(clickerCooldownAd / 1000)}s`, "error");
      return;
    }
    
    if (!adsReady) {
      showNotification("⏳ AdsGram carregando...", "info");
      return;
    }

    const success = await showAd(() => {
      setClickerRewardedActive(true);
      setClickerRewardedTimeLeft(60); // 60 segundos de boost
      setClickerCooldownAd(CONFIG.CLICKER.COOLDOWN_ANUNCIO_REWARDED);
      showNotification("🚀 +50% chance de drop por 60s!", "success");
      addTransaction('anuncio', 'Anúncio Rewarded no Clicker', '+50% chance 60s');
    }, () => {
      showNotification("❌ Anúncio não completado", "error");
    });

    if (!success) {
      showNotification("❌ Erro ao carregar anúncio", "error");
    }
  }, [adsReady, showAd, clickerCooldownAd, showNotification, addTransaction]);

  // Timer do minijogos clicker
  useEffect(() => {
    if (!showClicker) return;
    
    clickerIntervalRef.current = setInterval(() => {
      // Decai combo
      setClickerCombo(prev => {
        if (prev > 0) return prev - 1;
        return 0;
      });

      // Atualiza tempo do rewarded
      setClickerRewardedTimeLeft(prev => {
        if (prev > 0) return prev - 1;
        if (prev === 0 && clickerRewardedActive) {
          setClickerRewardedActive(false);
          showNotification("⏱️ Boost de chance terminou!", "info");
        }
        return 0;
      });

      // Atualiza cooldown do anúncio
      setClickerCooldownAd(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => {
      if (clickerIntervalRef.current) {
        clearInterval(clickerIntervalRef.current);
      }
    };
  }, [showClicker, clickerRewardedActive, showNotification]);

  // Reseta limite diário do clicker
  useEffect(() => {
    const agora = Date.now();
    const umDia = 24 * 60 * 60 * 1000;
    
    if (agora - clickerUltimoReset > umDia) {
      setClickerTerraGanhoHoje(0);
      setClickerUltimoReset(agora);
      setClickerClicks(0);
    }
  }, [clickerUltimoReset]);

  // ==================== CARREGAMENTO ====================
  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    WebApp.disableVerticalSwipes?.();
    const tgUserId = WebApp.initDataUnsafe?.user?.id;
    if (tgUserId) {
      setUserId(tgUserId);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setFazenda((f) => f.map((s) => {
        if (s.status === "plantado" && s.tempo > 0) {
          const decremento = aceleradorAtivo ? 2 : 1;
          const novo_tempo = Math.max(0, s.tempo - decremento);
          const crescimento = s.tempoTotal > 0 ? (s.tempoTotal - novo_tempo) / s.tempoTotal : 0;
          return { ...s, tempo: novo_tempo, crescimento: Math.min(1, crescimento) };
        }
        if (s.status === "plantado" && s.tempo <= 0) return { ...s, status: "pronto", crescimento: 1 };
        return s;
      }));

      if (aceleradorAtivo && tempoAcelerador > 0) {
        setTempoAcelerador(t => t - 1);
        if (tempoAcelerador <= 1) {
          setAceleradorAtivo(false);
          showNotification("⏱️ Boost 2x terminou!", "info");
        }
      }

      if (terraStaked > 0) {
        const rewardPerSecond = terraStaked * 0.0000005787;
        setStakingRewards(r => r + rewardPerSecond);
      }

      const agora = new Date();
      const amanha = new Date();
      amanha.setDate(agora.getDate() + 1);
      amanha.setHours(0, 0, 0, 0);
      const diferenca = amanha.getTime() - agora.getTime();
      const horas = Math.floor(diferenca / (1000 * 60 * 60));
      const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
      setTempoResetDiario(`${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`);
      
      setEnergia((e) => (e < 100 ? Math.min(100, e + 0.15) : 100));
      
      setLevelBar({ atual: xp, maximo: xpNec });
      setEnergiaBar({ atual: energia, maximo: 100 });
    }, 1000);
    return () => clearInterval(timer);
  }, [aceleradorAtivo, tempoAcelerador, terraStaked, showNotification, xp, xpNec, energia]);

  useEffect(() => {
    WebApp.CloudStorage.getItem("saved_game_2026_v3", (err, value) => {
      if (!err && value) {
        try {
          const d = JSON.parse(value);
          console.log("📂 Carregando do CloudStorage:", d);
          loadGameData(d);
        } catch (e) { 
          console.error("Erro parse CloudStorage:", e);
          tryLoadFromLocalStorage();
        }
      } else {
        tryLoadFromLocalStorage();
      }
    });
    
    function tryLoadFromLocalStorage() {
      try {
        const backup = localStorage.getItem("galactic_farm_backup");
        if (backup) {
          const d = JSON.parse(backup);
          console.log("📂 Carregando do localStorage backup:", d);
          loadGameData(d);
          return;
        }
      } catch (e) {
        console.log("localStorage não disponível");
      }
      console.log("🆕 Novo jogo iniciado");
      setIsLoaded(true);
    }
    
    function loadGameData(d: any) {
      setTickets(d.tickets ?? 5000);
      setTerraToken(d.terraToken ?? 0);
      setNivel(d.nivel ?? 1);
      setXp(d.xp ?? 0);
      setEnergia(d.energia ?? 100);
      setInv(d.inv ?? { PLASMA: 10, CORN: 0, TOMATO: 0, VOID: 0, CRYSTAL: 0 });
      setSlots(d.slots ?? [true, true, true, false, false, false, false, false, false]);
      
      setTerraStaked(d.terraStaked ?? 0);
      setStakingRewards(d.stakingRewards ?? 0);
      setLastStakingClaim(d.lastStakingClaim ?? Date.now());
      
      setSlotLevels(d.slotLevels ?? Array(9).fill(0));
      setGirosHoje(d.girosHoje ?? 0);
      setLastDailyClick(d.lastDailyClick ?? 0);
      setDailyRewards(d.dailyRewards ?? CONFIG.RECOMPENSAS.map(r => ({...r, coletado: false})));
      setAnimais(d.animais ?? []);
      setProdutosAnimais(d.produtosAnimais ?? { 
        ovo: 0, 
        leite: 0, 
        "lã": 0,
        leite_nebuloso: 0,
        essencia_estelar: 0
      });
      setUltimoGiroGratis(d.ultimoGiroGratis ?? 0);
      setLastWithdrawTime(d.lastWithdrawTime ?? 0);
      
      // Carrega dados do clicker
      setClickerTerraGanhoHoje(d.clickerTerraGanhoHoje ?? 0);
      setClickerUltimoReset(d.clickerUltimoReset ?? Date.now());
      setTransactions(d.transactions ?? []);
      
      if (d.fazenda && Array.isArray(d.fazenda)) {
        console.log("🌱 Fazenda carregada:", d.fazenda);
        setFazenda(d.fazenda);
      }
      
      setIsLoaded(true);
      console.log("✅ Dados carregados com sucesso!");
    }
    
    setTimeout(() => setIsReady(true), 500);
  }, []);

  // Timer para próximo giro grátis da roleta
  useEffect(() => {
    const interval = setInterval(() => {
      const agora = Date.now();
      const umDia = 24 * 60 * 60 * 1000;
      
      if (ultimoGiroGratis > 0) {
        const tempoRestante = umDia - (agora - ultimoGiroGratis);
        if (tempoRestante > 0) {
          const horas = Math.floor(tempoRestante / (1000 * 60 * 60));
          const minutos = Math.floor((tempoRestante % (1000 * 60 * 60)) / (1000 * 60));
          setTempoProximoGiro(`${horas}h ${minutos}m`);
        } else {
          setTempoProximoGiro("Disponível!");
          setGiroGratuitoDisponivel(true);
        }
      } else {
        setTempoProximoGiro("Disponível!");
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [ultimoGiroGratis]);

  // ==================== RANKING ====================
  const fetchRanking = async () => {
    if (!BACKEND_URL) {
      console.warn("BACKEND_URL não definido, usando dados de exemplo.");
      setRanking([
        { name: "Conecte o Backend", nivel: 1, tickets: 0, terraToken: 0 },
      ]);
      return;
    }
    setLoadingRanking(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/ranking`);
      const data = await res.json();
      if (data.success) {
        setRanking(data.ranking);
      } else {
        console.error("Erro ao buscar ranking:", data.error);
        setRanking([]);
      }
    } catch (e) {
      console.error("Erro de conexão com o ranking:", e);
      setRanking([]);
    } finally {
      setLoadingRanking(false);
    }
  };

  useEffect(() => {
    if (aba === "ranking") fetchRanking();
  }, [aba]);

  // ==================== ANÚNCIOS ====================
  const watchAdForSeed = async () => {
    if (!adsReady) { showNotification("⏳ AdsGram carregando...", "info"); return; }
    showNotification("🎥 Carregando anúncio...", "info");
    const success = await showAd(() => {
      setInv(p => ({ ...p, PLASMA: (p.PLASMA || 0) + 1 }));
      WebApp.HapticFeedback.notificationOccurred("success");
      showNotification("✨ +1 Semente Cósmica!", "success");
      createParticles(150, 400, "#818cf8");
      addTransaction('anuncio', 'Assistiu anúncio por semente', '+1 Cósmica');
      saveGameInstant();
    }, () => showNotification("❌ Anúncio não completado", "error"));
    if (!success) showNotification("❌ Erro ao carregar anúncio", "error");
  };

  const watchAdForDailyReward = async () => {
    if (!adsReady) { showNotification("⏳ AdsGram carregando...", "info"); return; }
    showNotification("🎥 Carregando anúncio...", "info");
    const success = await showAd(() => {
      coletarRecompensa(true);
      WebApp.HapticFeedback.notificationOccurred("success");
      createParticles(200, 300, "#fbbf24");
      setShowDailyAd(false);
    }, () => showNotification("❌ Anúncio não completado", "error"));
    if (!success) showNotification("❌ Erro ao carregar anúncio", "error");
  };

  const watchAdForFreeSpin = async () => {
    if (!adsReady) { showNotification("⏳ AdsGram carregando...", "info"); return; }
    showNotification("🎥 Carregando anúncio...", "info");
    const success = await showAd(() => girarRoleta(true), () => showNotification("❌ Anúncio não completado", "error"));
    if (!success) showNotification("❌ Erro ao carregar anúncio", "error");
  };

  const watchAdForEnergy = async () => {
    if (!adsReady) { showNotification("⏳ AdsGram carregando...", "info"); return; }
    showNotification("🎥 Carregando anúncio...", "info");
    const success = await showAd(() => {
      setEnergia(100);
      WebApp.HapticFeedback.notificationOccurred("success");
      showNotification("⚡ Energia restaurada 100%!", "success");
      createParticles(150, 500, "#10b981");
      addTransaction('anuncio', 'Assistiu anúncio por energia', 'Energia 100%');
      saveGameInstant();
    }, () => showNotification("❌ Anúncio não completado", "error"));
    if (!success) showNotification("❌ Erro ao carregar anúncio", "error");
  };

  const watchAdFor4xHarvest = async (slotId: number) => {
    if (!adsReady) { showNotification("⏳ AdsGram carregando...", "info"); return; }
    showNotification("🎥 Carregando anúncio...", "info");
    const success = await showAd(() => {
      handleHarvest(slotId, 4, true);
      setSlotParaColeta(null);
    }, () => showNotification("❌ Anúncio não completado", "error"));
    if (!success) showNotification("❌ Erro ao carregar anúncio", "error");
  };

  // ==================== COLETAR RECOMPENSA DIÁRIA ====================
  const coletarRecompensa = (usarAd: boolean = false) => {
    const agora = Date.now();
    const umDia = 24 * 60 * 60 * 1000;
    
    if (!usarAd && (agora - lastDailyClick) < umDia) {
      const restante = umDia - (agora - lastDailyClick);
      const h = Math.floor(restante / (1000 * 60 * 60));
      const m = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60));
      showNotification(`⏳ Aguarde ${h}h ${m}m para a próxima recompensa!`, "error");
      return;
    }

    const recompensa = dailyRewards.find(r => !r.coletado);
    if (!recompensa) {
      setDailyRewards(CONFIG.RECOMPENSAS.map(r => ({...r, coletado: false})));
      setCurrentDailyDay(null);
      showNotification("🎉 Ciclo completo! Reiniciando...", "success");
      return;
    }

    setXp(x => x + recompensa.xp);
    setTickets(t => t + recompensa.tkt);
    setInv(p => ({ ...p, [recompensa.item]: (p[recompensa.item] || 0) + 1 }));
    setDailyRewards(prev => prev.map(r => r.dia === recompensa.dia ? { ...r, coletado: true } : r));
    
    setCurrentDailyDay(recompensa.dia - 1);
    setLastDailyClick(agora);
    showNotification(`✅ Dia ${recompensa.dia} coletado! +${recompensa.xp} XP +${recompensa.tkt} 🎟️ +1 ${recompensa.item}`, "success");
    addTransaction('ganho', `Recompensa Diária Dia ${recompensa.dia}`, `+${recompensa.tkt} tickets, +1 ${recompensa.item}`);

    if (recompensa.dia === 7) {
      setTimeout(() => {
        setDailyRewards(CONFIG.RECOMPENSAS.map(r => ({...r, coletado: false})));
        setCurrentDailyDay(null);
        showNotification("🎉 Ciclo de 7 dias completado! Reiniciando...", "success");
        saveGameInstant();
      }, 2000);
    } else {
      saveGameInstant();
    }
  };

  // ==================== STAKING ====================
  const handleStake = (amount: number) => {
    if (terraToken < amount) { showNotification(`💎 Precisa de ${amount} TERRA!`, "error"); return; }
    const novoStaked = terraStaked + amount;
    const tierAnterior = currentStakingTier.index;
    setTerraToken(t => t - amount);
    setTerraStaked(novoStaked);
    const novoTierIndex = CONFIG.STAKING_TIERS.findIndex(t => novoStaked >= t.amount) + 1;
    if (novoTierIndex > tierAnterior && novoTierIndex < CONFIG.STAKING_TIERS.length) {
      const novoTier = CONFIG.STAKING_TIERS[novoTierIndex];
      WebApp.HapticFeedback.notificationOccurred("success");
      showNotification(`🎉 NOVO TIER: ${novoTier.nome}! +${(novoTier.xpBonus * 100).toFixed(0)}% XP`, "success");
      createParticles(150, 300, novoTier.color);
    } else {
      showNotification(`⚛️ ${amount} TERRA staked! +${(stakingAPY).toFixed(3)}/dia`, "success");
    }
    addTransaction('staking', `Stake de ${amount} TERRA`, `-${amount} TERRA`);
    saveGameInstant();
  };

  const handleUnstake = (amount: number) => {
    if (terraStaked < amount) { showNotification("💎 Saldo em stake insuficiente!", "error"); return; }
    const penalidade = amount * 0.05;
    const receber = amount - penalidade;
    setTerraStaked(s => s - amount);
    const totalReceber = receber + stakingRewards;
    setTerraToken(t => t + totalReceber);
    if (stakingRewards > 0.001) {
      showNotification(`💰 ${receber.toFixed(2)} + ${stakingRewards.toFixed(4)} recompensas!`, "success");
      setStakingRewards(0);
    } else {
      showNotification(`💎 ${receber.toFixed(2)} TERRA sacados (taxa: ${penalidade.toFixed(2)})`, "info");
    }
    addTransaction('staking', `Unstake de ${amount} TERRA`, `+${totalReceber.toFixed(2)} TERRA`);
    saveGameInstant();
  };

  const resgatarStakingRewards = () => {
    if (stakingRewards < 0.001) { showNotification("Mínimo: 0.001 TERRA para resgatar", "info"); return; }
    setTerraToken(t => t + stakingRewards);
    showNotification(`🎁 ${stakingRewards.toFixed(4)} TERRA resgatados!`, "success");
    addTransaction('ganho', 'Resgate de staking', `+${stakingRewards.toFixed(4)} TERRA`);
    setStakingRewards(0);
    setLastStakingClaim(Date.now());
    saveGameInstant();
  };

  // ==================== SAQUE ====================
  const handleWithdraw = async () => {
    if (window.conversaoRecente) {
      showNotification("⏳ Aguarde 2 segundos após converter", "error");
      return;
    }
    if (!wallet) { showNotification("🔗 Conecte sua carteira TON!", "error"); return; }
    if (!userId) { showNotification("Usuário não autenticado", "error"); return; }
    if (terraToken < MIN_WITHDRAW) { showNotification(`Mínimo: ${MIN_WITHDRAW} TERRA`, "error"); return; }
    const now = Date.now();
    if (now - lastWithdrawTime < LOCK_TIME_MS) {
      const seg = Math.ceil((LOCK_TIME_MS - (now - lastWithdrawTime)) / 1000);
      showNotification(`Aguarde ${seg}s`, "error");
      return;
    }
    const taxa = terraToken * TAXA_SAQUE_PERCENTUAL;
    const valorFinal = terraToken - taxa;
    const confirmar = window.confirm(`💸 SAQUE TERRA\n\n💎 Saldo: ${terraToken.toFixed(2)}\n📊 Taxa (10%): -${taxa.toFixed(2)}\n─────────────────────\n✅ Você recebe: ~${valorFinal.toFixed(2)} TERRA\n\n📍 ${wallet.slice(0, 6)}...${wallet.slice(-4)}\n⏱️ 1-3 minutos\n\nConfirmar?`);
    if (!confirmar) return;
    setLoadingSaque(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/sacar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: terraToken, destinationAddress: wallet })
      });
      const data = await response.json();
      if (data.success) {
        setTerraToken(data.data.novoSaldo ?? 0);
        setLastWithdrawTime(Date.now());
        setUltimoSaque(new Date().toISOString());
        setSaquesHoje(s => s + 1);
        addTransaction('saque', `Saque de ${valorFinal.toFixed(2)} TERRA`, `-${terraToken.toFixed(2)} TERRA`);
        saveGameInstant();
        showNotification(`✅ Saque enviado!`, "success");
      } else { showNotification(`❌ ${data.error}`, "error"); }
    } catch (err) { showNotification("Erro de conexão", "error"); } finally { setLoadingSaque(false); }
  };

  const girarRoleta = (usarAds: boolean = false) => {
    const agora = Date.now();
    const umDia = 24 * 60 * 60 * 1000;

    if (usarAds && ultimoGiroGratis > 0 && (agora - ultimoGiroGratis) < umDia) {
      const restante = umDia - (agora - ultimoGiroGratis);
      const horas = Math.floor(restante / (1000 * 60 * 60));
      const minutos = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60));
      showNotification(`⏳ Você já usou seu giro grátis hoje. Volte em ${horas}h ${minutos}m`, "error");
      return;
    }

    if (!usarAds && terraToken < CONFIG.ROLETA_CUSTO_TERRA) {
      showNotification(`💎 Precisa de ${CONFIG.ROLETA_CUSTO_TERRA} TERRA`, "error");
      return;
    }

    if (!usarAds) {
      setTerraToken(t => t - CONFIG.ROLETA_CUSTO_TERRA);
    }

    if (usarAds) {
      setUltimoGiroGratis(agora);
      setGiroGratuitoDisponivel(false);
    }

    setGiroAtivo(true);
    setPremioRoleta(null);
    setHighlightedItem(null);

    const totalPeso = CONFIG.ROLETA_PREMIOS.reduce((s, p) => s + p.peso, 0);
    let random = Math.random() * totalPeso;
    let premioIndex = 0;
    for (let i = 0; i < CONFIG.ROLETA_PREMIOS.length; i++) {
      if (random < CONFIG.ROLETA_PREMIOS[i].peso) { premioIndex = i; break; }
      random -= CONFIG.ROLETA_PREMIOS[i].peso;
    }

    const premio = CONFIG.ROLETA_PREMIOS[premioIndex];
    const anguloPorItem = 360 / CONFIG.ROLETA_PREMIOS.length;
    const anguloAlvo = 270 - (premioIndex * anguloPorItem) - (anguloPorItem / 2);
    const rotacoes = 5 + Math.floor(Math.random() * 3);
    const rotacaoFinal = rotacoes * 360 + anguloAlvo;
    let startTime: number | null = null;
    const duration = 4000;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation = easeOut * rotacaoFinal;
      setRoletaRotation(currentRotation);
      const grausAtuais = (360 - (currentRotation % 360)) % 360;
      const itemAtual = Math.floor((grausAtuais + (anguloPorItem / 2)) / anguloPorItem) % CONFIG.ROLETA_PREMIOS.length;
      setHighlightedItem(itemAtual);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          setPremioRoleta(premio);
          setGiroAtivo(false);
          aplicarPremioRoleta(premio);
          saveGameInstant();
        }, 500);
      }
    };

    requestAnimationFrame(animate);
  };

  const aplicarPremioRoleta = (premio: any) => {
    let mensagem = "";
    
    switch(premio.tipo) {
      case "PLASMA": case "CORN": case "TOMATO": case "VOID": case "CRYSTAL":
        setInv(p => ({ ...p, [premio.tipo]: (p[premio.tipo] || 0) + premio.quantidade }));
        mensagem = `🎊 ${premio.quantidade}x ${premio.nome}!`;
        addTransaction('ganho', `Prêmio da Roleta`, `+${premio.quantidade}x ${premio.nome}`);
        break;
        
      case "TERRA":
        setTerraToken(t => t + premio.quantidade);
        mensagem = `🎊 ${premio.quantidade} TERRA!`;
        addTransaction('ganho', `Prêmio da Roleta`, `+${premio.quantidade} TERRA`);
        break;
        
      case "TICKETS":
        setTickets(t => t + premio.quantidade);
        mensagem = `🎊 ${premio.quantidade.toLocaleString()} tickets!`;
        addTransaction('ganho', `Prêmio da Roleta`, `+${premio.quantidade} tickets`);
        break;
    }
    
    setTimeout(() => {
      showInterstitial().catch(() => {});
    }, 1500);

    WebApp.HapticFeedback.impactOccurred(premio.valor >= 1 ? "heavy" : premio.valor >= 0.5 ? "medium" : "light");
    showNotification(mensagem, "success");
    createParticles(150, 200, premio.color);
  };

  // ==================== ANIMAIS ====================
  const comprarAnimal = (tipo: string) => {
    const animalConfig = CONFIG.ANIMAIS[tipo as keyof typeof CONFIG.ANIMAIS];
    if (!animalConfig) return;
    
    if (terraToken < animalConfig.preco) {
      showNotification(`💎 Precisa de ${animalConfig.preco} TERRA!`, "error");
      return;
    }
    
    const novoAnimal = {
      id: `animal_${Date.now()}_${Math.random()}`,
      tipo,
      nome: animalConfig.nome,
      icone: animalConfig.icone,
      ultimaColeta: Date.now(),
      tempoProducao: animalConfig.tempoProducao,
      produto: animalConfig.produto,
      produtoIcone: animalConfig.produtoIcone
    };
    
    setTerraToken(t => t - animalConfig.preco);
    setAnimais(prev => [...prev, novoAnimal]);
    showNotification(`✅ ${animalConfig.nome} comprada!`, "success");
    addTransaction('compra', `Comprou ${animalConfig.nome}`, `-${animalConfig.preco} TERRA`);
    saveGameInstant();
  };

  const venderAnimal = (animalId: string) => {
    const animal = animais.find(a => a.id === animalId);
    if (!animal) return;
    
    const animalConfig = CONFIG.ANIMAIS[animal.tipo as keyof typeof CONFIG.ANIMAIS];
    const valorVenda = animalConfig.valorVenda;
    
    if (!window.confirm(`Vender ${animal.nome} por ${valorVenda.toLocaleString()} tickets?\n\n⚠️ O animal será removido permanentemente!`)) return;
    
    setAnimais(prev => prev.filter(a => a.id !== animalId));
    setTickets(t => t + valorVenda);
    showNotification(`💰 ${animal.nome} vendida por ${valorVenda.toLocaleString()} tickets!`, "success");
    addTransaction('venda', `Vendeu ${animal.nome}`, `+${valorVenda} tickets`);
    createParticles(200, 300, "#fbbf24");
    saveGameInstant();
  };

  const coletarAnimal = (animalId: string) => {
    setAnimais(prev => prev.map(animal => {
      if (animal.id !== animalId) return animal;
      
      const agora = Date.now();
      const tempoPassado = agora - animal.ultimaColeta;
      const animalConfig = CONFIG.ANIMAIS[animal.tipo as keyof typeof CONFIG.ANIMAIS];
      
      if (tempoPassado >= animal.tempoProducao) {
        const ciclos = Math.floor(tempoPassado / animal.tempoProducao);
        
        setProdutosAnimais(p => ({
          ...p,
          [animal.produto]: (p[animal.produto] || 0) + ciclos
        }));
        
        showNotification(`✅ +${ciclos} ${animal.produto}!`, "success");
        return { ...animal, ultimaColeta: agora };
      } else {
        const tempoRestante = animal.tempoProducao - tempoPassado;
        const minutos = Math.ceil(tempoRestante / 60000);
        showNotification(`⏳ Ainda não produziu! Espere ${minutos}min`, "info");
        return animal;
      }
    }));
    saveGameInstant();
  };

  const venderProdutos = (produto: string, quantidade: number, valor: number) => {
    if (produtosAnimais[produto] < quantidade) {
      showNotification(`❌ Você não tem ${quantidade} ${produto}!`, "error");
      return;
    }
    
    setProdutosAnimais(p => ({ ...p, [produto]: p[produto] - quantidade }));
    setTickets(t => t + (quantidade * valor));
    showNotification(`💰 Vendido ${quantidade} ${produto} por ${quantidade * valor} tickets!`, "success");
    addTransaction('venda', `Vendeu ${quantidade}x ${produto}`, `+${quantidade * valor} tickets`);
    saveGameInstant();
  };

  // ==================== FAZENDA ====================
  const plantar = (slotId: number, tipo: string) => {
    const itemInfo = CONFIG.LOJA[tipo as keyof typeof CONFIG.LOJA];
    if (energia < itemInfo.energia) { showNotification("⚡ Energia insuficiente!", "error"); return; }
    
    const newInv = { ...inv, [tipo]: inv[tipo] - 1 };
    const newEnergia = energia - itemInfo.energia;
    const newFazenda = fazenda.map(x => x.id === slotId ? {
      ...x, status: "plantado", tipo, tempo: itemInfo.tempo, tempoTotal: itemInfo.tempo,
      plantadoEm: Date.now(), crescimento: 0.01
    } : x);
    
    setInv(newInv);
    setEnergia(newEnergia);
    setFazenda(newFazenda);
    setSelSlot(null);
    
    const data = JSON.stringify({
      tickets, 
      terraToken, 
      nivel, 
      xp, 
      energia: newEnergia, 
      inv: newInv, 
      slots, 
      fazenda: newFazenda,
      terraStaked, 
      stakingRewards, 
      slotLevels, 
      dailyRewards,
      aceleradorAtivo, 
      tempoAcelerador, 
      ultimoSaque, 
      saquesHoje, 
      girosHoje,
      lastStakingClaim, 
      lastDailyClick, 
      animais, 
      produtosAnimais,
      ultimoGiroGratis,
      lastWithdrawTime,
      clickerTerraGanhoHoje,
      clickerUltimoReset,
      transactions: transactions.slice(0, 10)
    });
    
    WebApp.CloudStorage.setItem("saved_game_2026_v3", data, (err) => {
      if (err) console.error("❌ Erro ao salvar plantação:", err);
      else console.log("💾 Plantação salva IMEDIATAMENTE!");
    });
    
    try {
      localStorage.setItem("galactic_farm_backup", data);
    } catch (e) {}
    
    showNotification(`${itemInfo.icone} ${itemInfo.nome} plantado!`, "success");
  };

  const handleHarvest = (slotId: number, multiplier: number, usarAds: boolean = false) => {
    const slot = fazenda.find(s => s.id === slotId);
    if (!slot || slot.status !== 'pronto') return;
    if (!usarAds && multiplier === 4) { showNotification("⚠️ Use o botão de anúncio para 4x!", "error"); return; }
    const info = CONFIG.LOJA[slot.tipo as keyof typeof CONFIG.LOJA];
    const forgeBonus = slotLevels[slotId] * CONFIG.FORGE_BONUS_PER_LEVEL;
    const stakingBonus = currentStakingTier.ticketBonus;
    const totalBonus = 1 + forgeBonus + stakingBonus;
    const finalTickets = Math.floor(info.lucro * totalBonus * multiplier);
    const finalXp = Math.floor(info.xp * (1 + currentStakingTier.xpBonus) * multiplier);
    
    const newTickets = tickets + finalTickets;
    const newFazenda = fazenda.map(x => x.id === slotId ? { ...x, status: "vazio", tipo: "", plantadoEm: null, crescimento: 0 } : x);
    
    setTickets(newTickets);
    setFazenda(newFazenda);
    setSlotParaColeta(null);
    
    const data = JSON.stringify({
      tickets: newTickets, 
      terraToken, 
      nivel, 
      xp, 
      energia, 
      inv, 
      slots, 
      fazenda: newFazenda,
      terraStaked, 
      stakingRewards, 
      slotLevels, 
      dailyRewards,
      aceleradorAtivo, 
      tempoAcelerador, 
      ultimoSaque, 
      saquesHoje, 
      girosHoje,
      lastStakingClaim, 
      lastDailyClick, 
      animais, 
      produtosAnimais,
      ultimoGiroGratis,
      lastWithdrawTime,
      clickerTerraGanhoHoje,
      clickerUltimoReset,
      transactions
    });
    
    WebApp.CloudStorage.setItem("saved_game_2026_v3", data, (err) => {
      if (err) console.error("❌ Erro ao salvar colheita:", err);
      else console.log("💾 Colheita salva IMEDIATAMENTE!");
    });
    
    try {
      localStorage.setItem("galactic_farm_backup", data);
    } catch (e) {}
    
    setXp(prev => {
      const novoXp = prev + finalXp;
      const xpNecessario = xpNec;
      
      if (novoXp >= xpNecessario) {
        const xpExcedente = novoXp - xpNecessario;
        setNivel(n => {
          const novoNivel = n + 1;
          showInterstitial().catch(() => {});
          showNotification(`🎉 LEVEL UP! Nível ${novoNivel}!`, "success");
          createParticles(200, 300, "#8b5cf6");
          return novoNivel;
        });
        return xpExcedente;
      }
      return novoXp;
    });
    
    const boostText = multiplier === 4 ? "4X SUPER BOOST!" : multiplier === 2 ? "2X BOOST!" : "";
    showNotification(multiplier > 1 ? `✨✨ +${finalTickets.toLocaleString()} ${boostText}` : `🌾 +${finalTickets.toLocaleString()}`, "success");
    addTransaction('ganho', `Colheita ${info.nome} ${multiplier}x`, `+${finalTickets} tickets`);
    createParticles(100 + (slotId % 3) * 100, 300 + Math.floor(slotId / 3) * 100, info.color);
    
    if (Math.random() < 0.2) {
      showInterstitial().catch(() => {});
    }
  };

  const handleForge = (slotId: number) => {
    const currentLevel = slotLevels[slotId];
    if (currentLevel >= CONFIG.FORGE_COSTS.length) { showNotification("Nível máximo atingido!", "info"); return; }
    const upgrade = CONFIG.FORGE_COSTS[currentLevel];
    if (terraToken < upgrade.cost) { showNotification(`Precisa de ${upgrade.cost} TERRA`, "error"); return; }
    if (!window.confirm(`Aprimorar Slot ${slotId + 1}?\nCusto: ${upgrade.cost} TERRA\nChance: ${Math.round(upgrade.chance * 100)}%`)) return;
    setTerraToken(t => t - upgrade.cost);
    if (Math.random() < upgrade.chance) {
      setSlotLevels(l => l.map((lvl, idx) => idx === slotId ? lvl + 1 : lvl));
      WebApp.HapticFeedback.notificationOccurred("success");
      showNotification(`🎉 Slot ${slotId + 1} → Nível ${currentLevel + 1}!`, "success");
      createParticles(150, 400, "#fbbf24");
    } else {
      WebApp.HapticFeedback.notificationOccurred("error");
      showNotification("❌ Falha no upgrade", "error");
    }
    saveGameInstant();
  };

  const handleDailyRewardClick = (dayIndex: number) => {
    const agora = Date.now();
    const umDia = 24 * 60 * 60 * 1000;
    
    if (agora - lastDailyClick < umDia) {
        const restante = umDia - (agora - lastDailyClick);
        const h = Math.floor(restante / (1000 * 60 * 60));
        const m = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60));
        showNotification(`⏳ Aguarde ${h}h ${m}m para a próxima recompensa!`, "error");
        return;
    }
    
    const reward = dailyRewards[dayIndex];
    if (reward.coletado) { showNotification("Já coletado hoje!", "info"); return; }
    if (dayIndex > 0 && !dailyRewards[dayIndex - 1].coletado) { showNotification(`Complete o dia ${dayIndex} primeiro!`, "error"); return; }
    
    setCurrentDailyDay(dayIndex);
    setShowDailyAd(true);
  };

  const realizarCompra = async (valorEmTerra: number) => {
    if (!wallet || !tonConnectUI.connected) { 
      showNotification("🔗 Conecte a carteira primeiro!", "error"); 
      return; 
    }
    
    if (valorEmTerra < CONFIG.MIN_COMPRA_TERRA) {
      showNotification(`⚠️ Mínimo: ${CONFIG.MIN_COMPRA_TERRA} TERRA (para compensar taxas da rede)`, "error");
      return;
    }
    
    const valorTotalEmTON = valorEmTerra * CONFIG.TAXA_COMPRA_TON;
    
    const confirmar = window.confirm(
      `💎 COMPRAR TERRA\n\n` +
      `💰 Quantidade: ${valorEmTerra} TERRA\n` +
      `💵 Total: ${valorTotalEmTON.toFixed(2)} TON\n` +
      `⛽ Taxa da rede: ~0.01 TON (já inclusa)\n\n` +
      `📊 IMPORTANTE:\n` +
      `• Mínimo de ${CONFIG.MIN_COMPRA_TERRA} TERRA devido às taxas\n` +
      `• O token será creditado automaticamente\n\n` +
      `Confirmar compra?`
    );
    
    if (!confirmar) return;

    const carteiraAdmin = Address.parse("UQDxQVvR1EaRooLgcSSkiyR9nr0yNkcg2JLzU1HJ5yX-oVzP");
    const payload = beginCell().storeUint(0, 32).storeStringTail(`Compra ${valorEmTerra} TERRA`).endCell();
    try {
      WebApp.HapticFeedback.impactOccurred("light");
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [{
          address: carteiraAdmin.toString(),
          amount: toNano(valorTotalEmTON.toString()).toString(),
          payload: payload.toBoc().toString("base64"),
        }],
      });
      setTerraToken(t => t + valorEmTerra);
      showNotification(`✅ +${valorEmTerra} TERRA!`, "success");
      addTransaction('compra', `Comprou ${valorEmTerra} TERRA`, `-${valorTotalEmTON.toFixed(2)} TON`);
      saveGameInstant();
    } catch (error) { showNotification("❌ Transação cancelada", "error"); }
  };

  const compartilharJogo = () => {
    const link = `https://t.me/Fazenda_2026_bot/jogar?startapp=${userId}`;
    const texto = "🚀 Ganhe 500 moedas grátis na Galactic Farm! Use meu link!";
    WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(texto)}`);
  };

  // ==================== HELPERS ====================
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getCrescimentoIcon = (tipo: string, crescimento: number) => {
    const icons: { [key: string]: string[] } = {
      "PLASMA": ["🌱", "☄️", "🌌", "🌠✨"],
      "CORN": ["🌱", "🌾", "🌽", "🌽🌽"],
      "TOMATO": ["🌱", "🌿", "🍏", "🍅🍅"],
      "VOID": ["🌱", "⚡", "🔱", "🔱✨"],
      "CRYSTAL": ["🌱", "💠", "💎", "💎✨"]
    };
    const stage = Math.min(Math.floor(crescimento * 4), 3);
    return icons[tipo]?.[stage] || "🌱";
  };

  // ==================== RENDER: LOADING ====================
  if (!isLoaded) {
    const dica = DICAS[Math.floor(Math.random() * DICAS.length)];
    return (
      <div style={{ background: "linear-gradient(135deg, #0a0f1a, #1a1f3d)", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ width: "200px", height: "200px", borderRadius: "50%", background: "conic-gradient(from 0deg, #1e293b, #0f172a, #1e293b)", animation: "spin-slow 3s linear infinite", filter: "blur(20px)", opacity: 0.6 }} />
        <div style={{ position: "absolute", fontSize: "64px", animation: "float 3s ease-in-out infinite" }}>🚀</div>
        <h1 style={{ marginTop: "40px", fontSize: "32px", fontWeight: "800", background: "linear-gradient(90deg, #8b5cf6, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GALACTIC FARM</h1>
        <p style={{ color: "#94a3b8", marginTop: "20px", fontSize: "14px", textAlign: "center", maxWidth: "300px" }}>{dica}</p>
        <div style={{ width: "200px", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginTop: "30px", overflow: "hidden" }}>
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #8b5cf6, #22d3ee)", animation: "shimmer 2s infinite" }} />
        </div>
      </div>
    );
  }

  // ==================== RENDER: MINIJOGOS CLICKER ====================
  const renderClicker = () => {
    if (!showClicker) return null;
    
    const seedConfig = clickerSeed ? CONFIG.SEMENTES_CLICKER[clickerSeed as keyof typeof CONFIG.SEMENTES_CLICKER] : null;
    
    return (
      <div style={STYLES.clickerContainer}>
        <button 
          onClick={() => setShowClicker(false)}
          style={{ 
            position: "absolute", 
            top: "20px", 
            right: "20px", 
            background: "rgba(239,68,68,0.8)", 
            border: "none", 
            color: "#fff", 
            borderRadius: "50%", 
            width: "40px", 
            height: "40px", 
            fontSize: "20px",
            cursor: "pointer",
            zIndex: 10
          }}
        >
          ✕
        </button>

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, color: "#fff", fontSize: "24px", fontWeight: "800" }}>
            {seedConfig ? `${seedConfig.icone} ${seedConfig.nome}` : "Minijogo"}
          </h2>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
            Cliques: {clickerClicks} | Combo: {clickerCombo}x
          </div>
          <div style={{ fontSize: "11px", color: "#fbbf24", marginTop: "4px" }}>
            Terra hoje: {clickerTerraGanhoHoje}/{CONFIG.CLICKER.LIMITE_DIARIO_TERRA} 💎
          </div>
        </div>

        {/* Barra de combo */}
        <div style={STYLES.clickerComboBar}>
          <div 
            style={{
              ...STYLES.clickerComboFill,
              width: `${Math.min(clickerCombo / 20 * 100, 100)}%`
            }} 
          />
        </div>

        {/* Planta clicável */}
        <div 
          onClick={handleClickerClick}
          style={{
            ...STYLES.clickerPlant,
            background: seedConfig ? `radial-gradient(circle, ${seedConfig.color}40, transparent)` : 'transparent',
            transform: `scale(${1 + (clickerCombo > 10 ? 0.1 : 0)})`,
            filter: clickerCombo >= 10 ? `drop-shadow(0 0 30px ${seedConfig?.color})` : 'none',
            animation: clickerCombo >= 5 ? 'plant-pulse 0.5s infinite' : 'none'
          }}
        >
          <span style={{ 
            fontSize: "120px",
            filter: clickerCombo >= 20 ? 'drop-shadow(0 0 20px gold)' : 'none'
          }}>
            {seedConfig?.icone || "🌱"}
          </span>
          
          {/* Glow de combo alto */}
          {clickerCombo >= 10 && (
            <div style={{
              position: "absolute",
              inset: "-20px",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${seedConfig?.color}60, transparent 70%)`,
              animation: "glow-pulse 1s infinite",
              pointerEvents: "none"
            }} />
          )}
        </div>

        {/* Botão de anúncio rewarded */}
        <button
          onClick={watchAdForClickerBoost}
          disabled={clickerCooldownAd > 0 || adLoading}
          style={{
            marginTop: "30px",
            background: clickerCooldownAd > 0 
              ? "rgba(100,100,100,0.3)" 
              : "linear-gradient(145deg, #10b981, #059669)",
            border: "none",
            color: "#fff",
            padding: "16px 32px",
            borderRadius: "16px",
            fontWeight: "700",
            fontSize: "14px",
            cursor: clickerCooldownAd > 0 ? "not-allowed" : "pointer",
            opacity: clickerCooldownAd > 0 ? 0.6 : 1,
            boxShadow: clickerCooldownAd > 0 ? "none" : "0 10px 30px rgba(16,185,129,0.4)"
          }}
        >
          {adLoading ? "⏳ Carregando..." : 
           clickerCooldownAd > 0 ? `⏳ ${Math.ceil(clickerCooldownAd / 1000)}s` : 
           clickerRewardedActive ? `🚀 Boost ativo (${clickerRewardedTimeLeft}s)` : 
           "🎥 Assistir Anúncio (+50% Chance)"}
        </button>

        <div style={{ 
          marginTop: "20px", 
          fontSize: "11px", 
          color: "#64748b",
          textAlign: "center",
          maxWidth: "300px"
        }}>
          💡 Quanto mais rápido você clicar, maior o combo e a chance de drops!
          <br/><br/>
          🎯 Drops: Sementes, Tickets e pouco TERRA (limite diário)
        </div>

        {/* Partículas de drops */}
        {clickerParticles.map(p => (
          <div
            key={p.id}
            style={{
              position: "fixed",
              left: p.x,
              top: p.y,
              fontSize: "32px",
              pointerEvents: "none",
              animation: "particle-float 1.5s ease-out forwards",
              zIndex: 2500,
              textShadow: `0 0 20px ${p.color}`
            }}
          >
            {p.emoji}
          </div>
        ))}
      </div>
    );
  };

  // ==================== RENDER: HISTÓRICO DE TRANSAÇÕES ====================
  const renderTransactionHistory = () => {
    if (!showTransactionHistory) return null;

    const getIcon = (tipo: string) => {
      switch(tipo) {
        case 'compra': return '🛒';
        case 'venda': return '💰';
        case 'drop': return '🎁';
        case 'anuncio': return '🎥';
        case 'ganho': return '✨';
        case 'saque': return '💸';
        case 'staking': return '⚛️';
        default: return '📝';
      }
    };

    const getColor = (tipo: string) => {
      switch(tipo) {
        case 'compra': return '#ef4444';
        case 'venda': return '#10b981';
        case 'drop': return '#8b5cf6';
        case 'anuncio': return '#f59e0b';
        case 'ganho': return '#22d3ee';
        case 'saque': return '#ec4899';
        case 'staking': return '#a855f7';
        default: return '#94a3b8';
      }
    };

    return (
      <div style={{
        ...STYLES.transactionHistory,
        ...(showTransactionHistory ? STYLES.transactionHistoryOpen : {})
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, color: "#fff", fontSize: "20px", fontWeight: "800" }}>
            📜 Histórico
          </h2>
          <button 
            onClick={() => setShowTransactionHistory(false)}
            style={{ 
              background: "rgba(239,68,68,0.8)", 
              border: "none", 
              color: "#fff", 
              borderRadius: "50%", 
              width: "36px", 
              height: "36px", 
              fontSize: "18px",
              cursor: "pointer"
            }}
          >
            ✕
          </button>
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📝</div>
            <p>Nenhuma transação ainda.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {transactions.map((tx) => (
              <div 
                key={tx.id}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "16px",
                  padding: "16px",
                  borderLeft: `4px solid ${getColor(tx.tipo)}`,
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}
              >
                <div style={{ 
                  fontSize: "24px",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: `${getColor(tx.tipo)}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {getIcon(tx.tipo)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>
                    {tx.descricao}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                    {formatDate(tx.data)}
                  </div>
                </div>
                <div style={{ 
                  fontSize: "13px", 
                  fontWeight: "700",
                  color: getColor(tx.tipo)
                }}>
                  {tx.valor}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ==================== RENDER: COMPONENTES PRINCIPAIS ====================
  const renderStatsFazenda = () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" }}>
      <div style={STYLES.statCard}>
        <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600" }}>TICKETS</div>
        <div style={{ fontSize: "18px", fontWeight: "800", color: "#fbbf24" }}>🎟️ {tickets.toLocaleString()}</div>
      </div>
      <div style={{ ...STYLES.statCard, textAlign: "center" }}>
        <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600" }}>LEVEL</div>
        <div style={{ fontSize: "22px", fontWeight: "900", color: "#8b5cf6" }}>{nivel}</div>
      </div>
      <div style={STYLES.statCard}>
        <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600" }}>TERRA</div>
        <div style={{ fontSize: "18px", fontWeight: "800", color: "#22d3ee" }}>💎 {terraToken.toFixed(2)}</div>
      </div>
    </div>
  );

  const renderBarras = () => (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
          <span>⚡ Nível {nivel}</span>
          <span>{xp} / {xpNec} XP</span>
        </div>
        <div style={{ ...STYLES.progressBar, height: "12px" }}>
          <div style={{ ...STYLES.progressFill, width: `${(xp / xpNec) * 100}%`, background: "linear-gradient(90deg, #8b5cf6, #c084fc)", boxShadow: "0 0 10px #8b5cf6" }} />
        </div>
      </div>
      
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
          <span>🔋 Energia</span>
          <span>{Math.round(energia)} / 100</span>
        </div>
        <div style={{ ...STYLES.progressBar, height: "12px" }}>
          <div style={{ ...STYLES.progressFill, width: `${energia}%`, background: "linear-gradient(90deg, #10b981, #34d399)", boxShadow: "0 0 10px #10b981" }} />
        </div>
      </div>
    </div>
  );

  const renderFazenda = () => (
    <>
      {renderStatsFazenda()}
      {renderBarras()}
      
      <div style={{
        background: "linear-gradient(145deg, #ef4444, #dc2626)",
        borderRadius: "12px",
        padding: "12px",
        marginBottom: "20px",
        border: "1px solid rgba(255,255,255,0.2)",
        boxShadow: "0 0 20px rgba(239,68,68,0.5)",
        animation: "pulse-glow 2s infinite"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <span style={{ fontSize: "24px" }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: "14px",
              fontWeight: "800",
              color: "#fff",
              marginBottom: "4px"
            }}>
              ATENÇÃO FAZENDEIRO! 🚨
            </div>
            <div style={{
              fontSize: "12px",
              color: "#fff",
              opacity: 0.9
            }}>
              Não feche o app ou saia da página enquanto tiver plantações crescendo!
              Se sair, você PERDE O PROGRESSO da colheita atual.
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "0 4px" }}> 
        <h2 style={{ margin: 0, color: "#fff", fontSize: "20px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🌱</span> Sua Fazenda
        </h2>
        <div style={{ fontSize: "13px", color: "#94a3b8", background: "rgba(255,255,255,0.05)", padding: "6px 12px", borderRadius: "20px" }}>
          {fazenda.filter(s => s.status === "plantado").length}/9 ativos
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {fazenda.map((s, i) => {
          const isLocked = !slots[i];
          const isReady = s.status === "pronto";
          const isGrowing = s.status === "plantado";
          const itemInfo = isGrowing ? CONFIG.LOJA[s.tipo as keyof typeof CONFIG.LOJA] : null;
          return (
            <div key={i} onClick={() => {
              if (isLocked) {
                const info = CONFIG.DADOS_TERRENO[i];
                if (nivel >= info.nivelReq && tickets >= info.preco) {
                  const newSlots = slots.map((v, idx) => idx === i ? true : v);
                  const newTickets = tickets - info.preco;
                  setSlots(newSlots);
                  setTickets(newTickets);
                  
                  const data = JSON.stringify({
                    tickets: newTickets, 
                    terraToken, 
                    nivel, 
                    xp, 
                    energia, 
                    inv, 
                    slots: newSlots, 
                    fazenda,
                    terraStaked, 
                    stakingRewards, 
                    slotLevels, 
                    dailyRewards,
                    aceleradorAtivo, 
                    tempoAcelerador, 
                    ultimoSaque, 
                    saquesHoje, 
                    girosHoje,
                    lastStakingClaim, 
                    lastDailyClick, 
                    animais, 
                    produtosAnimais,
                    ultimoGiroGratis,
                    lastWithdrawTime,
                    clickerTerraGanhoHoje,
                    clickerUltimoReset,
                    transactions
                  });
                  
                  WebApp.CloudStorage.setItem("saved_game_2026_v3", data);
                  try { localStorage.setItem("galactic_farm_backup", data); } catch (e) {}
                  
                  showNotification(`🔓 Slot ${i + 1} desbloqueado!`, "success");
                } else { showNotification(`🔒 Nível ${info.nivelReq} + ${info.preco.toLocaleString()} 🎟️`, "error"); }
                return;
              }
              if (s.status === "vazio") setSelSlot(i);
              if (s.status === "pronto") setSlotParaColeta(s);
            }} style={{ ...STYLES.farmSlot, ...(isReady ? STYLES.farmSlotReady : {}), border: isReady ? "2px solid #22d3ee" : isGrowing ? `2px solid ${itemInfo?.color || "#8b5cf6"}` : "1px solid rgba(255,255,255,0.08)" }}>
              {isLocked ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "32px", opacity: 0.5, marginBottom: "8px" }}>🔒</div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>Slot {i + 1}</div>
                  <div style={{ fontSize: "10px", color: "#fbbf24", marginTop: "4px" }}>{CONFIG.DADOS_TERRENO[i].preco === 0 ? "GRÁTIS" : `${(CONFIG.DADOS_TERRENO[i].preco / 1000)}k 🎟️`}</div>
                </div>
              ) : isGrowing ? (
                <>
                  <div style={{ fontSize: "36px", transform: `scale(${0.7 + (s.crescimento || 0) * 0.5})`, transition: "transform 0.5s ease", filter: `drop-shadow(0 0 15px ${itemInfo?.color}60)`, marginBottom: "8px" }}>{getCrescimentoIcon(s.tipo, s.crescimento || 0)}</div>
                  {s.tempo > 0 && (
                    <>
                      <div style={{ position: "absolute", bottom: "10px", left: "10px", right: "10px", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px" }}>
                        <div style={{ width: `${((s.tempoTotal - s.tempo) / s.tempoTotal) * 100}%`, height: "100%", background: itemInfo?.gradient, borderRadius: "3px", boxShadow: `0 0 10px ${itemInfo?.color}` }} />
                      </div>
                      <div style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: "11px", padding: "4px 8px", borderRadius: "6px", fontWeight: "700", backdropFilter: "blur(4px)" }}>{formatTime(s.tempo)}</div>
                    </>
                  )}
                </>
              ) : isReady ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "40px", animation: "bounce-in 0.6s ease", filter: "drop-shadow(0 0 20px rgba(34,211,238,0.8))" }}>✨</div>
                  <div style={{ fontSize: "12px", color: "#22d3ee", fontWeight: "700", marginTop: "8px" }}>PRONTO!</div>
                </div>
              ) : ( <div style={{ fontSize: "40px", color: "rgba(255,255,255,0.2)" }}>⊕</div> )}
              {slots[i] && slotLevels[i] > 0 && (
                <div style={{ position: "absolute", top: "8px", left: "8px", background: "linear-gradient(145deg, #8b5cf6, #7c3aed)", color: "#fff", fontSize: "11px", padding: "4px 8px", borderRadius: "10px", fontWeight: "700", boxShadow: "0 4px 12px rgba(139,92,246,0.4)" }}>+{slotLevels[i]}⭐</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => setShowDaily(!showDaily)}
          style={{ ...STYLES.buttonSecondary, flex: 1, background: "linear-gradient(145deg, rgba(251,191,36,0.2), rgba(245,158,11,0.1))", border: "1px solid rgba(251,191,36,0.3)" }}
        >
          <span style={{ marginRight: "6px" }}>📅</span> Missão Diária
          <span style={{ marginLeft: "8px", background: "rgba(251,191,36,0.3)", padding: "2px 8px", borderRadius: "10px", fontSize: "11px" }}>
            {dailyRewards.filter(r => r.coletado).length}/7
          </span>
        </button>
        
        <button
          onClick={() => setShowRoleta(true)}
          style={{ ...STYLES.buttonSecondary, flex: 1, background: "linear-gradient(145deg, rgba(139,92,246,0.2), rgba(124,58,237,0.1))", border: "1px solid rgba(139,92,246,0.3)" }}
        >
          <span style={{ marginRight: "6px" }}>🎡</span> Roleta
          <span style={{ marginLeft: "8px", background: "rgba(139,92,246,0.3)", padding: "2px 8px", borderRadius: "10px", fontSize: "11px" }}>
            {girosHoje}/{CONFIG.ROLETA_MAX_GIRADOS_HOJE}
          </span>
        </button>
      </div>

      {showDaily && (
        <div style={{ ...STYLES.glass, marginTop: "16px", animation: "slideDown 0.4s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, color: "#fff", fontSize: "18px" }}>📅 Recompensas Diárias</h3>
            <div style={{ fontSize: "12px", color: "#fbbf24", background: "rgba(251,191,36,0.1)", padding: "6px 12px", borderRadius: "8px" }}>Reset: {tempoResetDiario}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
            {dailyRewards.map((r, i) => {
              const canCollect = i === 0 || dailyRewards[i-1]?.coletado;
              const isNext = canCollect && !r.coletado;
              return (
                <button key={i} onClick={() => isNext && handleDailyRewardClick(i)} disabled={!isNext} style={{ background: r.coletado ? "linear-gradient(145deg, rgba(16,185,129,0.3), rgba(16,185,129,0.2))" : isNext ? "linear-gradient(145deg, rgba(139,92,246,0.3), rgba(139,92,246,0.2))" : "rgba(255,255,255,0.05)", border: `2px solid ${r.coletado ? "#10b981" : isNext ? "#8b5cf6" : "rgba(255,255,255,0.1)"}`, borderRadius: "12px", padding: "12px 4px", textAlign: "center", cursor: isNext ? "pointer" : "default", opacity: !canCollect && !r.coletado ? 0.4 : 1, transform: isNext ? "scale(1.05)" : "scale(1)", transition: "all 0.2s ease", position: "relative" }}>
                  {isNext && ( <div style={{ position: "absolute", top: "-8px", right: "-8px", background: "#ef4444", color: "#fff", fontSize: "10px", padding: "4px 6px", borderRadius: "10px", fontWeight: "800", animation: "pulse-glow 1.5s infinite" }}>🎥 AD</div> )}
                  <div style={{ fontSize: "9px", color: "#94a3b8", marginBottom: "4px" }}>D{i+1}</div>
                  <div style={{ fontSize: "20px", marginBottom: "4px" }}>{CONFIG.LOJA[r.item as keyof typeof CONFIG.LOJA]?.icone}</div>
                  <div style={{ fontSize: "10px", color: r.coletado ? "#10b981" : isNext ? "#fbbf24" : "#64748b", fontWeight: "700" }}>{r.coletado ? "✓" : !canCollect ? "🔒" : `${(r.tkt/1000)}k`}</div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: "12px", fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>Aguarde 24h entre coletas ou use anúncio!</div>
        </div>
      )}
    </>
  );

  const renderLoja = () => (
    <div style={STYLES.glass}>
      <h2 style={{ margin: "0 0 20px 0", color: "#fff", fontSize: "22px", fontWeight: "800", textAlign: "center" }}>🛒 Loja Estelar</h2>
      
      <h3 style={{ margin: "20px 0 10px 0", color: "#fff", fontSize: "18px" }}>🌱 Sementes</h3>
      {Object.entries(CONFIG.LOJA).map(([key, item]) => (
        <div key={key} style={{ background: "linear-gradient(145deg, rgba(51,65,85,0.6), rgba(30,41,59,0.8))", borderRadius: "20px", padding: "20px", marginBottom: "16px", border: `2px solid ${item.isAd ? "#10b981" : item.color}40`, display: "flex", alignItems: "center", gap: "16px", boxShadow: `0 10px 30px ${item.color}20` }}>
          <div style={{ width: "70px", height: "70px", borderRadius: "18px", background: item.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", boxShadow: `0 10px 30px ${item.color}50`, flexShrink: 0 }}>{item.icone}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "#fff", marginBottom: "4px" }}>{item.nome}</div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>{item.desc}</div>
            <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#64748b" }}><span>⏱️ {formatTime(item.tempo)}</span><span>⚡ {item.energia}%</span></div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "14px", fontWeight: "800", color: item.isAd ? "#10b981" : item.precoTickets > 0 ? "#fbbf24" : "#22d3ee", marginBottom: "8px" }}>{item.isAd ? "🎥 GRÁTIS" : item.precoTickets > 0 ? `${item.precoTickets.toLocaleString()} 🎟️` : `${item.precoTerra} 💎`}</div>
            <button onClick={() => {
              if (item.isAd) { watchAdForSeed(); } else if (item.precoTickets > 0) {
                if (tickets < item.precoTickets) { showNotification("🎟️ Tickets insuficientes!", "error"); return; }
                setTickets(t => t - item.precoTickets);
                setInv(p => ({ ...p, [key]: (p[key] || 0) + 1 }));
                WebApp.HapticFeedback.impactOccurred("medium");
                showNotification(`✅ ${item.nome} comprado!`, "success");
                addTransaction('compra', `Comprou ${item.nome}`, `-${item.precoTickets} tickets`);
                saveGameInstant();
              } else {
                if (terraToken < item.precoTerra) { showNotification("💎 TERRA insuficiente!", "error"); return; }
                setTerraToken(t => t - item.precoTerra);
                setInv(p => ({ ...p, [key]: (p[key] || 0) + 1 }));
                WebApp.HapticFeedback.impactOccurred("medium");
                showNotification(`✅ ${item.nome} comprado!`, "success");
                addTransaction('compra', `Comprou ${item.nome}`, `-${item.precoTerra} TERRA`);
                saveGameInstant();
              }
            }} disabled={adLoading} style={{ background: item.isAd ? "linear-gradient(145deg, #10b981, #059669)" : item.precoTickets > 0 ? "linear-gradient(145deg, #fbbf24, #f59e0b)" : "linear-gradient(145deg, #22d3ee, #06b6d4)", border: "none", color: item.precoTickets > 0 ? "#000" : "#fff", padding: "10px 16px", borderRadius: "12px", fontWeight: "800", fontSize: "12px", cursor: adLoading ? "wait" : "pointer", opacity: adLoading ? 0.7 : 1 }}>{adLoading ? "⏳" : "COMPRAR"}</button>
          </div>
        </div>
      ))}
      
      <h3 style={{ margin: "30px 0 10px 0", color: "#fff", fontSize: "18px" }}>🐄 Animais</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {Object.entries(CONFIG.ANIMAIS).map(([key, animal]) => (
          <div key={key} style={{
            background: (animal as any).tier === "Endgame" 
              ? "linear-gradient(145deg, rgba(168,85,247,0.2), rgba(124,58,237,0.1))"
              : (animal as any).tier === "Intermediário+"
              ? "linear-gradient(145deg, rgba(34,211,238,0.1), rgba(6,182,212,0.05))"
              : "linear-gradient(145deg, rgba(139,92,246,0.1), rgba(124,58,237,0.05))",
            borderRadius: "16px",
            padding: "16px",
            border: (animal as any).tier === "Endgame"
              ? "2px solid rgba(168,85,247,0.5)"
              : (animal as any).tier === "Intermediário+"
              ? "2px solid rgba(34,211,238,0.5)"
              : "1px solid rgba(139,92,246,0.3)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden"
          }}>
            {(animal as any).tier && (
              <div style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                fontSize: "10px",
                padding: "4px 8px",
                borderRadius: "8px",
                fontWeight: "700",
                background: (animal as any).tier === "Endgame" ? "#a855f7" : "#22d3ee",
                color: "#fff"
              }}>
                {(animal as any).tier}
              </div>
            )}
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>{animal.icone}</div>
            <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>{animal.nome}</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "8px" }}>{animal.desc}</div>
            <div style={{ fontSize: "12px", color: "#22d3ee", marginBottom: "12px", fontWeight: "700" }}>{animal.preco} 💎</div>
            <button
              onClick={() => comprarAnimal(key)}
               disabled={terraToken < animal.preco}
              style={{
                background: terraToken >= animal.preco ? "linear-gradient(145deg, #10b981, #059669)" : "rgba(255,255,255,0.1)",
                border: "none",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "12px",
                cursor: terraToken >= animal.preco ? "pointer" : "not-allowed",
                width: "100%"
              }}
            >
              {terraToken >= animal.preco ? "COMPRAR" : "BLOQUEADO"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRanking = () => (
    <div style={STYLES.glass}>
      <h2 style={{ margin: "0 0 20px 0", color: "#fff", fontSize: "22px", fontWeight: "800", textAlign: "center" }}>🏆 Ranking Global</h2>
      {loadingRanking ? ( 
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Carregando...</div> 
      ) : ranking.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {ranking.map((user, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "16px", border: idx === 0 ? "1px solid #fbbf24" : "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: idx === 0 ? "#fbbf24" : idx === 1 ? "#c0c0c0" : idx === 2 ? "#cd7f32" : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", color: idx < 3 ? "#000" : "#fff" }}>{idx + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "700", color: "#fff" }}>{user.name || "Desconhecido"}</div>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>Nível {user.nivel || 1}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#fbbf24", fontWeight: "700" }}>{(user.tickets || 0).toLocaleString()} 🎟️</div>
                <div style={{ fontSize: "11px", color: "#22d3ee" }}>{(user.terraToken || 0).toFixed(1)} 💎</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          Nenhum jogador encontrado. Seja o primeiro!
        </div>
      )}
    </div>
  );

  const renderPerfil = () => (
    <div style={STYLES.glass}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ width: "100px", height: "100px", borderRadius: "50%", margin: "0 auto 16px", background: "linear-gradient(145deg, #8b5cf6, #ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px", border: "4px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 40px rgba(139,92,246,0.4)" }}>{WebApp.initDataUnsafe?.user?.first_name?.[0]?.toUpperCase() || "👤"}</div>
        <h3 style={{ margin: "0 0 4px 0", color: "#fff", fontSize: "22px", fontWeight: "800" }}>{WebApp.initDataUnsafe?.user?.first_name || "Piloto"}</h3>
        <div style={{ fontSize: "12px", color: "#64748b" }}>ID: {WebApp.initDataUnsafe?.user?.id || "000000"}</div>
      </div>

      <div style={{ ...STYLES.glassPremium, marginBottom: "24px" }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#fff", fontSize: "18px", textAlign: "center" }}>📦 Seu Inventário</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
          {Object.entries(inv).map(([key, qtd]) => (
            <div key={key} style={{ background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "10px 4px", textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "24px" }}>{CONFIG.LOJA[key as keyof typeof CONFIG.LOJA]?.icone}</div>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#fff" }}>{qtd}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        <div style={{ textAlign: "center", padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "16px" }}>
          <div style={{ fontSize: "24px", fontWeight: "900", color: "#8b5cf6" }}>{nivel}</div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>Nível</div>
        </div>
        <div style={{ textAlign: "center", padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "16px" }}>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#10b981" }}>{xp}/{xpNec}</div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>XP</div>
        </div>
      </div>

      <button onClick={compartilharJogo} style={{ ...STYLES.buttonPrimary, marginBottom: "12px", background: "linear-gradient(145deg, #3b82f6, #2563eb)" }}>👥 Convidar Amigos (+500 🎟️)</button>
      <button onClick={watchAdForEnergy} disabled={adLoading} style={{ ...STYLES.buttonPrimary, background: "linear-gradient(145deg, #10b981, #059669)", opacity: adLoading ? 0.7 : 1 }}>{adLoading ? "⏳" : "🎥 Restaurar Energia (100%)"}</button>
    </div>
  );

  const renderLaboratorio = () => (
    <div style={STYLES.glass}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <h2 style={{ margin: "0 0 8px 0", color: "#fff", fontSize: "24px", fontWeight: "800" }}>⚛️ Laboratório</h2>
        <p style={{ fontSize: "13px", color: "#94a3b8" }}>{CONFIG.AVISOS.STAKING}</p>
      </div>
      
      <div style={{ ...STYLES.glassPremium, marginBottom: "24px" }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#fff", fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>👑</span> Melhores Stakers
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {CONFIG.MELHORES_STAKERS.slice(0, 5).map((staker, idx) => {
            const tier = CONFIG.STAKING_TIERS.find(t => t.nome === staker.tier);
            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: idx === 0 ? "#fbbf24" : idx === 1 ? "#c0c0c0" : idx === 2 ? "#cd7f32" : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800" }}>{idx + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>{staker.nome}</div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>{staker.amount} 💎</div>
                </div>
                <div style={{ fontSize: "12px", fontWeight: "700", color: tier?.color || "#fff" }}>{staker.tier} {tier?.icon}</div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div style={STYLES.glassPremium}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>Total Staked</div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#22d3ee" }}>{terraStaked.toFixed(2)} 💎</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>Recompensas</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#10b981" }}>+{stakingRewards.toFixed(4)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
          {[10, 50, 100].map(amount => (
            <button key={amount} onClick={() => handleStake(amount)} disabled={terraToken < amount} style={{ flex: 1, background: terraToken >= amount ? "linear-gradient(145deg, #8b5cf6, #7c3aed)" : "rgba(100,100,100,0.2)", border: "none", color: "#fff", padding: "12px", borderRadius: "12px", fontWeight: "700", fontSize: "12px", cursor: terraToken >= amount ? "pointer" : "not-allowed" }}>STAKE {amount}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={resgatarStakingRewards} disabled={stakingRewards < 0.001} style={{ flex: 1, background: stakingRewards >= 0.001 ? "linear-gradient(145deg, #10b981, #059669)" : "rgba(16,185,129,0.2)", border: "none", color: "#fff", padding: "12px", borderRadius: "12px", fontWeight: "700", fontSize: "12px" }}>RESGATAR</button>
          <button onClick={() => handleUnstake(terraStaked)} disabled={terraStaked === 0} style={{ flex: 1, background: terraStaked > 0 ? "linear-gradient(145deg, #ef4444, #dc2626)" : "rgba(239,68,68,0.2)", border: "none", color: "#fff", padding: "12px", borderRadius: "12px", fontWeight: "700", fontSize: "12px", cursor: terraStaked > 0 ? "pointer" : "not-allowed" }}>UNSTAKE</button>
        </div>
      </div>
    </div>
  );

  const renderAnimais = () => (
    <div style={STYLES.glass}>
      <h2 style={{ margin: "0 0 20px 0", color: "#fff", fontSize: "22px", fontWeight: "800", textAlign: "center" }}>🐄 Seus Animais</h2>
      
      {animais.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>🥚</div>
          <p style={{ color: "#94a3b8", marginBottom: "20px" }}>Você ainda não tem animais.</p>
          <button 
            onClick={() => setAba("loja")}
            style={{ ...STYLES.buttonPrimary }}
          >
            IR PARA LOJA →
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: "12px", marginBottom: "24px" }}>
            {animais.map(animal => {
              const agora = Date.now();
              const tempoPassado = agora - animal.ultimaColeta;
              const tempoRestante = animal.tempoProducao - tempoPassado;
              const pronto = tempoPassado >= animal.tempoProducao;
              const minutosRestantes = pronto ? 0 : Math.ceil(tempoRestante / 60000);
              const animalConfig = CONFIG.ANIMAIS[animal.tipo as keyof typeof CONFIG.ANIMAIS];
              
              return (
                <div key={animal.id} style={{
                  background: (animalConfig as any).tier === "Endgame"
                    ? "linear-gradient(145deg, rgba(168,85,247,0.2), rgba(124,58,237,0.1))"
                    : (animalConfig as any).tier === "Intermediário+"
                    ? "linear-gradient(145deg, rgba(34,211,238,0.15), rgba(6,182,212,0.05))"
                    : "linear-gradient(145deg, rgba(51,65,85,0.6), rgba(30,41,59,0.8))",
                  borderRadius: "16px",
                  padding: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: pronto 
                    ? (animalConfig as any).tier === "Endgame" 
                      ? "2px solid #a855f7"
                      : (animalConfig as any).tier === "Intermediário+"
                      ? "2px solid #22d3ee"
                      : "2px solid #10b981"
                    : "1px solid rgba(255,255,255,0.1)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "32px" }}>{animal.icone}</span>
                    <div>
                      <div style={{ fontWeight: "700" }}>{animal.nome}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {pronto ? "✅ Pronto para coletar!" : `⏳ Próximo em ${minutosRestantes}min`}
                      </div>
                      {(animalConfig as any).tier && (
                        <div style={{ 
                          fontSize: "10px", 
                          color: (animalConfig as any).tier === "Endgame" ? "#a855f7" : "#22d3ee",
                          marginTop: "2px"
                        }}>
                          {(animalConfig as any).tier}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => coletarAnimal(animal.id)}
                      disabled={!pronto}
                      style={{
                        background: pronto ? "linear-gradient(145deg, #10b981, #059669)" : "rgba(255,255,255,0.1)",
                        border: "none",
                        color: "#fff",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: pronto ? "pointer" : "not-allowed"
                      }}
                    >
                      Coletar
                    </button>
                    <button
                      onClick={() => venderAnimal(animal.id)}
                      style={{
                        background: "linear-gradient(145deg, #ef4444, #dc2626)",
                        border: "none",
                        color: "#fff",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer"
                      }}
                      title={`Vender por ${animalConfig.valorVenda.toLocaleString()} tickets`}
                    >
                      💰
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div style={STYLES.glassPremium}>
            <h3 style={{ margin: "0 0 16px 0", color: "#fff", fontSize: "18px", textAlign: "center" }}>
              📦 Seus Produtos
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" }}>
              {Object.entries(produtosAnimais).filter(([key]) => key !== 'leite_nebuloso' && key !== 'essencia_estelar').map(([produto, qtd]) => {
                const config = Object.values(CONFIG.ANIMAIS).find(a => a.produto === produto);
                if (!config) return null;
                return (
                  <div key={produto} style={{ textAlign: "center", background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "12px" }}>
                    <div style={{ fontSize: "32px", marginBottom: "4px" }}>{config.produtoIcone}</div>
                    <div style={{ fontSize: "18px", fontWeight: "700", color: "#fbbf24" }}>{qtd || 0}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{config.produto}</div>
                    <button
                      onClick={() => venderProdutos(produto, 1, config.valorProduto)}
                      disabled={(qtd || 0) < 1}
                      style={{
                        background: (qtd || 0) >= 1 ? "linear-gradient(145deg, #fbbf24, #f59e0b)" : "rgba(255,255,255,0.1)",
                        border: "none",
                        color: (qtd || 0) >= 1 ? "#000" : "#fff",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "10px",
                        marginTop: "8px",
                        cursor: (qtd || 0) >= 1 ? "pointer" : "not-allowed",
                        width: "100%"
                      }}
                    >
                      Vender (1 = {config.valorProduto.toLocaleString()} 🎟️)
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Produtos dos novos animais */}
            {(produtosAnimais.leite_nebuloso > 0 || produtosAnimais.essencia_estelar > 0) && (
              <div style={{ 
                marginTop: "16px",
                padding: "16px",
                background: "rgba(139,92,246,0.1)",
                borderRadius: "12px",
                border: "1px solid rgba(139,92,246,0.3)"
              }}>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff", marginBottom: "12px", textAlign: "center" }}>
                  🌟 Produtos Especiais
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {produtosAnimais.leite_nebuloso > 0 && (
                    <div style={{ textAlign: "center", background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "12px" }}>
                      <div style={{ fontSize: "32px", marginBottom: "4px" }}>🥛✨</div>
                      <div style={{ fontSize: "18px", fontWeight: "700", color: "#22d3ee" }}>{produtosAnimais.leite_nebuloso}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Leite Nebuloso</div>
                      <button
                        onClick={() => venderProdutos('leite_nebuloso', 1, CONFIG.ANIMAIS.CABRA.valorProduto)}
                        style={{
                          background: "linear-gradient(145deg, #22d3ee, #06b6d4)",
                          border: "none",
                          color: "#000",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "10px",
                          marginTop: "8px",
                          cursor: "pointer",
                          width: "100%"
                        }}
                      >
                        Vender ({CONFIG.ANIMAIS.CABRA.valorProduto.toLocaleString()} 🎟️)
                      </button>
                    </div>
                  )}
                  {produtosAnimais.essencia_estelar > 0 && (
                    <div style={{ textAlign: "center", background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "12px" }}>
                      <div style={{ fontSize: "32px", marginBottom: "4px" }}>⭐</div>
                      <div style={{ fontSize: "18px", fontWeight: "700", color: "#a855f7" }}>{produtosAnimais.essencia_estelar}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Essência Estelar</div>
                      <button
                        onClick={() => venderProdutos('essencia_estelar', 1, CONFIG.ANIMAIS.DRAGAO.valorProduto)}
                        style={{
                          background: "linear-gradient(145deg, #a855f7, #7c3aed)",
                          border: "none",
                          color: "#fff",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "10px",
                          marginTop: "8px",
                          cursor: "pointer",
                          width: "100%"
                        }}
                      >
                        Vender ({CONFIG.ANIMAIS.DRAGAO.valorProduto.toLocaleString()} 🎟️)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", marginTop: "16px" }}>
              Os animais produzem automaticamente com o tempo. Não esqueça de coletar!
              <br/><br/>
              💡 <strong>Dica:</strong> Você pode vender animais usados para recuperar tickets (70% do valor de compra)!
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderBanco = () => (
    <div style={STYLES.glass}>
      <h2 style={{ margin: "0 0 20px 0", color: "#fff", fontSize: "22px", fontWeight: "800", textAlign: "center" }}>🏦 Banco Galáctico</h2>
      
      <div style={{ 
        background: "linear-gradient(145deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))",
        borderRadius: "12px",
        padding: "12px",
        marginBottom: "16px",
        border: "1px solid rgba(239,68,68,0.3)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>⚠️</span>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            <strong style={{ color: "#ef4444" }}>ATENÇÃO:</strong> Mínimo de 20 TERRA por compra (para compensar taxas da rede)
          </div>
        </div>
      </div>
      
      <div style={{ ...STYLES.glassPremium, marginBottom: "16px", background: "linear-gradient(145deg, rgba(34,211,238,0.1), rgba(6,182,212,0.05))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>💎 Em Staking</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#22d3ee" }}>{terraStaked.toFixed(2)} TERRA</div>
          </div>
          <div style={{ fontSize: "13px", color: "#10b981", background: "rgba(16,185,129,0.2)", padding: "8px 12px", borderRadius: "12px" }}>
            ⚡ Rendendo +{(terraStaked * 0.005).toFixed(3)}/dia
          </div>
        </div>
      </div>
      
      <div style={{ ...STYLES.glassPremium, marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#22d3ee", fontSize: "18px", textAlign: "center" }}>💳 COMPRAR TERRA</h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <button 
            onClick={() => realizarCompra(20)} 
            disabled={!wallet || adLoading}
            style={{ 
              ...STYLES.buttonSecondary, 
              background: "linear-gradient(145deg, #22d3ee, #06b6d4)",
              border: "none",
              opacity: (!wallet || adLoading) ? 0.5 : 1
            }}
          >
            20 TERRA (≈ 1 TON)
          </button>
          <button 
            onClick={() => realizarCompra(50)} 
            disabled={!wallet || adLoading}
            style={{ 
              ...STYLES.buttonSecondary, 
              background: "linear-gradient(145deg, #22d3ee, #06b6d4)",
              border: "none",
              opacity: (!wallet || adLoading) ? 0.5 : 1
            }}
          >
            50 TERRA (≈ 2.5 TON)
          </button>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <button 
            onClick={() => realizarCompra(100)} 
            disabled={!wallet || adLoading}
            style={{ 
              ...STYLES.buttonSecondary, 
              background: "linear-gradient(145deg, #22d3ee, #06b6d4)",
              border: "none",
              opacity: (!wallet || adLoading) ? 0.5 : 1
            }}
          >
            100 TERRA (≈ 5 TON)
          </button>
          <button 
            onClick={() => {
              const valor = prompt("Digite a quantidade de TERRA (mínimo 20):", "100");
              if (valor) realizarCompra(Number(valor));
            }} 
            disabled={!wallet || adLoading}
            style={{ 
              ...STYLES.buttonSecondary, 
              background: "linear-gradient(145deg, #22d3ee, #06b6d4)",
              border: "none",
              opacity: (!wallet || adLoading) ? 0.5 : 1
            }}
          >
            ⚡ Personalizado
          </button>
        </div>
        
        <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", marginTop: "8px" }}>
          {!wallet ? "🔗 Conecte a carteira primeiro" : "💰 1 TERRA = 0.05 TON"}
        </div>
      </div>
      
      <div style={STYLES.glassPremium}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", color: "#94a3b8" }}>Saldo Disponível</div>
          <div style={{ fontSize: "42px", fontWeight: "900", color: "#22d3ee" }}>{terraToken.toFixed(2)} 💎</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <button onClick={() => {
            if (tickets < CONFIG.TAXA_TICKET_PARA_TERRA) {
              showNotification(`Precisa de ${CONFIG.TAXA_TICKET_PARA_TERRA.toLocaleString()} 🎟️`, "error");
              return;
            }
            if (!window.confirm(`Converter ${CONFIG.TAXA_TICKET_PARA_TERRA.toLocaleString()} tickets → 1 TERRA?`)) return;

            const novosTickets = tickets - CONFIG.TAXA_TICKET_PARA_TERRA;
            const novoTERRA = terraToken + 1;

            window.conversaoRecente = true;
            setTimeout(() => {
              window.conversaoRecente = false;
            }, 2000);

            setTickets(novosTickets);
            setTerraToken(novoTERRA);
            
            const data = JSON.stringify({
              tickets: novosTickets, 
              terraToken: novoTERRA, 
              nivel, 
              xp, 
              energia, 
              inv, 
              slots, 
              fazenda,
              terraStaked, 
              stakingRewards, 
              slotLevels, 
              dailyRewards,
              aceleradorAtivo, 
              tempoAcelerador, 
              ultimoSaque, 
              saquesHoje, 
              girosHoje,
              lastStakingClaim, 
              lastDailyClick, 
              animais, 
              produtosAnimais,
              ultimoGiroGratis,
              lastWithdrawTime,
              clickerTerraGanhoHoje,
              clickerUltimoReset,
              transactions
            });
            
            WebApp.CloudStorage.setItem("saved_game_2026_v3", data);
            try { localStorage.setItem("galactic_farm_backup", data); } catch (e) {}
            
            if (userId && BACKEND_URL) {
              fetch(`${BACKEND_URL}/api/sincronizar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  name: WebApp.initDataUnsafe?.user?.first_name || "Piloto",
                  tickets: novosTickets,
                  terraToken: novoTERRA,
                  nivel,
                  xp,
                  energia,
                  terraStaked,
                  stakingRewards,
                  slotLevels,
                  dailyRewards,
                  girosHoje,
                  lastDailyClick
                })
              }).catch(e => console.log("Erro sync:", e));
            }

            showNotification("✅ 1 TERRA adquirido!", "success");
          }} style={{ ...STYLES.buttonSecondary, background: "linear-gradient(145deg, #10b981, #059669)", color: "#fff", border: "none" }}>
            {CONFIG.TAXA_TICKET_PARA_TERRA/1000}k 🎟️ → 1 💎
          </button>

          <button onClick={() => {
            if (terraToken < 1) {
              showNotification("Precisa de 1 TERRA", "error");
              return;
            }
            if (!window.confirm(`Converter 1 TERRA → ${CONFIG.TAXA_TERRA_PARA_TICKET.toLocaleString()} tickets?`)) return;
            
            const novoTERRA = terraToken - 1;
            const novosTickets = tickets + CONFIG.TAXA_TERRA_PARA_TICKET;

            setTerraToken(novoTERRA);
            setTickets(novosTickets);
            
            const data = JSON.stringify({
              tickets: novosTickets, 
              terraToken: novoTERRA, 
              nivel, 
              xp, 
              energia, 
              inv, 
              slots, 
              fazenda,
              terraStaked, 
              stakingRewards, 
              slotLevels, 
              dailyRewards,
              aceleradorAtivo, 
              tempoAcelerador, 
              ultimoSaque, 
              saquesHoje, 
              girosHoje,
              lastStakingClaim, 
              lastDailyClick, 
              animais, 
              produtosAnimais,
              ultimoGiroGratis,
              lastWithdrawTime,
              clickerTerraGanhoHoje,
              clickerUltimoReset,
              transactions
            });
            
            WebApp.CloudStorage.setItem("saved_game_2026_v3", data);
            try { localStorage.setItem("galactic_farm_backup", data); } catch (e) {}
            
            if (userId && BACKEND_URL) {
              fetch(`${BACKEND_URL}/api/sincronizar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  name: WebApp.initDataUnsafe?.user?.first_name || "Piloto",
                  tickets: novosTickets,
                  terraToken: novoTERRA,
                  nivel,
                  xp,
                  energia,
                  terraStaked,
                  stakingRewards,
                  slotLevels,
                  dailyRewards,
                  girosHoje,
                  lastDailyClick
                })
              }).catch(e => console.log("Erro sync:", e));
            }

            showNotification(`✅ ${CONFIG.TAXA_TERRA_PARA_TICKET.toLocaleString()} tickets!`, "success");
          }} style={{ ...STYLES.buttonSecondary, background: "linear-gradient(145deg, #fbbf24, #f59e0b)", color: "#000", border: "none" }}>
            1 💎 → {CONFIG.TAXA_TERRA_PARA_TICKET/1000}k 🎟️
          </button>
        </div>
      </div>      
      
      <div style={{ marginTop: "20px", textAlign: "center" }}><TonConnectButton /></div>

      <button
        onClick={handleWithdraw}
        disabled={loadingSaque || terraToken < MIN_WITHDRAW || !wallet}
        style={{
          ...STYLES.buttonPrimary,
          marginTop: "20px",
          background: terraToken >= MIN_WITHDRAW && wallet ? "linear-gradient(145deg, #a855f7, #7c3aed)" : "rgba(168,85,247,0.3)"
        }}
      >
        {loadingSaque ? "⏳ PROCESSANDO..." : "SACAR TUDO 🚀"}
      </button>

      <div style={{
        marginTop: "8px",
        fontSize: "11px",
        color: "#94a3b8",
        textAlign: "center"
      }}>
        💰 Mínimo para saque: <strong style={{ color: "#ef4444" }}>{MIN_WITHDRAW} TERRA</strong>
      </div>
    </div>
  );

  // ==================== MODAIS ====================
  const renderDailyAdModal = () => {
    if (!showDailyAd || currentDailyDay === null) return null;
    const reward = dailyRewards[currentDailyDay];
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ ...STYLES.glass, width: "100%", maxWidth: "360px", textAlign: "center" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>🎥</div>
          <h3 style={{ margin: "0 0 12px 0", color: "#fff", fontSize: "22px", fontWeight: "800" }}>Recompensa do Dia {currentDailyDay + 1}</h3>
          <div style={{ background: "rgba(139,92,246,0.1)", borderRadius: "16px", padding: "20px", marginBottom: "20px", border: "2px solid rgba(139,92,246,0.3)" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>{CONFIG.LOJA[reward.item as keyof typeof CONFIG.LOJA]?.icone}</div>
            <div style={{ fontSize: "18px", color: "#fff", fontWeight: "700" }}>+{reward.tkt.toLocaleString()} 🎟️</div>
            <div style={{ fontSize: "14px", color: "#10b981" }}>+{reward.xp} XP | +1 {reward.item}</div>
          </div>
          <button onClick={watchAdForDailyReward} disabled={adLoading} style={{ ...STYLES.buttonPrimary, marginBottom: "12px" }}>{adLoading ? "⏳ Carregando..." : "🎥 Assistir & Resgatar"}</button>
          <button onClick={() => { setShowDailyAd(false); setCurrentDailyDay(null); }} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "14px" }}>Cancelar</button>
        </div>
      </div>
    );
  };

  const renderPremiosRoleta = () => (
    <div style={{ 
      ...STYLES.glassPremium, 
      marginTop: "20px", 
      marginBottom: "20px",
      background: "linear-gradient(145deg, rgba(139,92,246,0.1), rgba(124,58,237,0.05))",
      border: "1px solid rgba(139,92,246,0.3)"
    }}>
      <h3 style={{ margin: "0 0 16px 0", color: "#8b5cf6", fontSize: "18px", textAlign: "center" }}>
        🎁 PRÊMIOS DA ROLETA
      </h3>
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(4, 1fr)", 
        gap: "12px"
      }}>
        {CONFIG.ROLETA_PREMIOS.map((premio, idx) => (
          <div key={idx} style={{
            background: "rgba(0,0,0,0.3)",
            borderRadius: "16px",
            padding: "12px 8px",
            textAlign: "center",
            border: `1px solid ${premio.color}40`,
            transition: "transform 0.2s ease, border 0.2s ease",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.border = `1px solid ${premio.color}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.border = `1px solid ${premio.color}40`;
          }}>
            <div style={{ fontSize: "28px", marginBottom: "4px" }}>{premio.emoji}</div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: premio.color }}>
              {premio.nome.split(' ')[0]}
            </div>
            {premio.quantidade && (
              <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>
                {premio.quantidade}x
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ 
        marginTop: "12px", 
        padding: "8px",
        background: "rgba(0,0,0,0.2)",
        borderRadius: "8px",
        fontSize: "11px",
        color: "#94a3b8",
        textAlign: "center"
      }}>
        ⚡ 1 giro grátis a cada 24h • 0.5 TERRA por giro extra
      </div>
    </div>
  );

  const renderRoletaModal = () => {
    const items = CONFIG.ROLETA_PREMIOS;
    const anglePerItem = 360 / items.length;
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ ...STYLES.glass, width: "100%", maxWidth: "400px", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
          <button onClick={() => !giroAtivo && setShowRoleta(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(239,68,68,0.8)", border: "none", color: "#fff", borderRadius: "50%", width: "36px", height: "36px", fontSize: "18px", cursor: giroAtivo ? "not-allowed" : "pointer", opacity: giroAtivo ? 0.5 : 1, zIndex: 10 }}>✕</button>
          <h2 style={{ margin: "0 0 20px 0", color: "#fff", fontSize: "24px", fontWeight: "800", textAlign: "center" }}>🎡 Roleta Galáctica</h2>
          
          <div style={{ textAlign: "center", marginBottom: "16px", fontSize: "13px", color: "#fbbf24" }}>
            {ultimoGiroGratis > 0 && tempoProximoGiro !== "Disponível!" && (
              <>⏳ Próximo giro grátis: {tempoProximoGiro}</>
            )}
            {tempoProximoGiro === "Disponível!" && (
              <>✅ Giro grátis disponível!</>
            )}
          </div>
          
          {premioRoleta ? (
            <div style={{ textAlign: "center", animation: "bounce-in 0.6s ease" }}>
              <div style={{ width: "140px", height: "140px", margin: "0 auto 24px", borderRadius: "50%", background: `linear-gradient(145deg, ${premioRoleta.color}, ${premioRoleta.color}80)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "72px", boxShadow: `0 0 60px ${premioRoleta.color}` }}>{premioRoleta.emoji}</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#fff", marginBottom: "8px" }}>{premioRoleta.nome}</div>
              <button onClick={() => setPremioRoleta(null)} style={{ ...STYLES.buttonPrimary }}>COLETAR</button>
            </div>
          ) : (
            <>
              <div style={STYLES.roletaContainer} ref={roletaRef}>
                <div style={STYLES.roletaOuterRing} /><div style={STYLES.roletaPointer} />
                {items.map((item, index) => {
                  const angle = index * anglePerItem - 90;
                  const radian = (angle * Math.PI) / 180;
                  const radius = 85;
                  const x = Math.cos(radian) * radius + 110;
                  const y = Math.sin(radian) * radius + 110;
                  const isHighlighted = highlightedItem === index;
                  return ( <div key={index} style={{ position: "absolute", left: `${x}px`, top: `${y}px`, width: "44px", height: "44px", borderRadius: "50%", background: `linear-gradient(145deg, ${item.color}, ${item.color}60)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", border: `3px solid ${isHighlighted ? "#fff" : "rgba(255,255,255,0.2)"}`, boxShadow: isHighlighted ? `0 0 30px ${item.color}` : "none", transform: isHighlighted ? "scale(1.2)" : "scale(1)", transition: "all 0.1s ease", zIndex: isHighlighted ? 5 : 1 }}>{item.emoji}</div> );
                })}
                <div style={{ ...STYLES.roletaCenter, transform: `translate(-50%, -50%) rotate(${roletaRotation}deg)` }}><div style={{ transform: `rotate(-${roletaRotation}deg)`, fontSize: "32px" }}>{giroAtivo ? "🎰" : "★"}</div></div>
              </div>
              
              {renderPremiosRoleta()}
              
              <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                <button 
                  onClick={watchAdForFreeSpin} 
                  disabled={giroAtivo || adLoading || !giroGratuitoDisponivel}
                  style={{ 
                    ...STYLES.buttonPrimary, 
                    flex: 1, 
                    background: giroGratuitoDisponivel ? "linear-gradient(145deg, #10b981, #059669)" : "rgba(100,100,100,0.3)",
                    opacity: (giroAtivo || adLoading || !giroGratuitoDisponivel) ? 0.5 : 1
                  }}
                >
                  {adLoading ? "⏳" : giroGratuitoDisponivel ? "🎥 GRÁTIS" : `⏳ ${tempoProximoGiro}`}
                </button>
                <button 
                  onClick={() => girarRoleta(false)} 
                  disabled={giroAtivo || terraToken < CONFIG.ROLETA_CUSTO_TERRA} 
                  style={{ ...STYLES.buttonPrimary, flex: 1 }}
                >
                  {giroAtivo ? "GIRANDO..." : `💎 ${CONFIG.ROLETA_CUSTO_TERRA}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderPlantioModal = () => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ ...STYLES.glass, width: "100%", maxWidth: "400px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, color: "#fff", fontSize: "20px" }}>🌱 Plantar no Slot {selSlot !== null ? selSlot + 1 : '?'}</h3>
          <button onClick={() => setSelSlot(null)} style={{ background: "rgba(239,68,68,0.8)", border: "none", color: "#fff", borderRadius: "50%", width: "32px", height: "32px", fontSize: "16px" }}>✕</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {Object.entries(inv).filter(([_, qtd]) => qtd > 0).map(([key, qtd]) => {
            const itemInfo = CONFIG.LOJA[key as keyof typeof CONFIG.LOJA];
            const energiaOk = energia >= itemInfo.energia;
            return (
              <button key={key} onClick={() => energiaOk && selSlot !== null && plantar(selSlot, key)} disabled={!energiaOk} style={{ background: itemInfo.gradient, border: "none", borderRadius: "16px", padding: "20px", color: "#fff", cursor: energiaOk ? "pointer" : "not-allowed", opacity: energiaOk ? 1 : 0.5, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <div style={{ fontSize: "40px" }}>{itemInfo.icone}</div>
                <div style={{ fontSize: "14px", fontWeight: "800" }}>{itemInfo.nome}</div>
                <div style={{ fontSize: "12px" }}>Tem: {qtd}</div>
                <div style={{ fontSize: "11px", background: "rgba(0,0,0,0.3)", padding: "4px 8px", borderRadius: "8px" }}>⚡ {itemInfo.energia}%</div>
              </button>
            );
          })}
        </div>
        {Object.values(inv).every(q => q === 0) && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "56px", marginBottom: "16px" }}>🛒</div>
            <div style={{ fontSize: "18px", color: "#fff", fontWeight: "700", marginBottom: "8px" }}>Inventário Vazio</div>
            <button onClick={() => { setSelSlot(null); setAba("loja"); }} style={{ ...STYLES.buttonPrimary }}>IR PARA LOJA →</button>
          </div>
        )}
      </div>
    </div>
  );

  const renderColetaModal = () => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ ...STYLES.glass, width: "100%", maxWidth: "400px", textAlign: "center" }}>
        {slotParaColeta && (
          <>
            <div style={{ fontSize: "80px", marginBottom: "20px", filter: "drop-shadow(0 0 30px rgba(34,211,238,0.8))" }}>{CONFIG.LOJA[slotParaColeta.tipo as keyof typeof CONFIG.LOJA]?.icone}</div>
            <h3 style={{ margin: "0 0 12px 0", color: "#fff", fontSize: "24px", fontWeight: "800" }}>Colheita Pronta!</h3>
            <div style={{ background: "rgba(34,211,238,0.1)", borderRadius: "16px", padding: "20px", marginBottom: "20px", border: "1px solid rgba(34,211,238,0.3)" }}>
              <div style={{ fontSize: "32px", fontWeight: "800", color: "#fbbf24" }}>+{CONFIG.LOJA[slotParaColeta.tipo as keyof typeof CONFIG.LOJA]?.lucro.toLocaleString()} 🎟️</div>
              <div style={{ fontSize: "14px", color: "#10b981" }}>+{CONFIG.LOJA[slotParaColeta.tipo as keyof typeof CONFIG.LOJA]?.xp} XP</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <button onClick={() => handleHarvest(slotParaColeta.id, 1)} style={{ ...STYLES.buttonSecondary, background: "linear-gradient(145deg, #22d3ee, #06b6d4)", border: "none" }}>1x</button>
              <button onClick={() => { if (terraToken >= 0.5) { setTerraToken(t => t - 0.5); handleHarvest(slotParaColeta.id, 2); } else { showNotification("💎 Precisa de 0.5 TERRA", "error"); } }} style={{ ...STYLES.buttonSecondary, background: "linear-gradient(145deg, #f59e0b, #d97706)", border: "none" }}>2x (0.5💎)</button>
              <button onClick={() => watchAdFor4xHarvest(slotParaColeta.id)} disabled={adLoading} style={{ ...STYLES.buttonSecondary, background: "linear-gradient(145deg, #10b981, #059669)", border: "none" }}>4x (🎥)</button>
            </div>
            <button onClick={() => handleForge(slotParaColeta.id)} style={{ ...STYLES.buttonSecondary, width: "100%", marginBottom: "12px", border: "2px dashed rgba(139,92,246,0.5)" }}>🔧 Aprimorar Slot (Nível {slotLevels[slotParaColeta.id]})</button>
            <button onClick={() => setSlotParaColeta(null)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "14px" }}>Cancelar</button>
          </>
        )}
      </div>
    </div>
  );

  // ==================== MODAL DE SELEÇÃO DE SEMENTE DO CLICKER ====================
const renderClickerSeedSelection = () => {
  if (!showClickerSeedModal) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ ...STYLES.glass, width: "100%", maxWidth: "400px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, color: "#fff", fontSize: "22px" }}>🌱 Escolha a Semente</h3>
          <button 
            onClick={() => setShowClickerSeedModal(false)}
            style={{ 
              background: "rgba(239,68,68,0.8)", 
              border: "none", 
              color: "#fff", 
              borderRadius: "50%", 
              width: "36px", 
              height: "36px", 
              fontSize: "18px",
              cursor: "pointer"
            }}
          >
            ✕
          </button>
        </div>
        
        <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", marginBottom: "20px" }}>
          Compre sementes para o minijogo clicker. Quanto mais cara, melhores os drops!
        </p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {Object.entries(CONFIG.SEMENTES_CLICKER).map(([key, seed]) => (
            <div key={key} style={{
              background: "linear-gradient(145deg, rgba(51,65,85,0.6), rgba(30,41,59,0.8))",
              borderRadius: "16px",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              border: `2px solid ${seed.color}40`
            }}>
              <div style={{
                width: "60px",
                height: "60px",
                borderRadius: "12px",
                background: `linear-gradient(135deg, ${seed.color}, ${seed.color}80)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px"
              }}>
                {seed.icone}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>{seed.nome}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>{seed.desc}</div>
                <div style={{ fontSize: "12px", color: seed.color, marginTop: "4px", fontWeight: "600" }}>
                  Chance: {(seed.chanceBase * 100).toFixed(1)}%
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#22d3ee", marginBottom: "8px" }}>
                  {seed.precoTerra} 💎
                </div>
                <button
                  onClick={() => {
                    if (terraToken < seed.precoTerra) {
                      showNotification("💎 TERRA insuficiente!", "error");
                      return;
                    }
                    setTerraToken(prev => prev - seed.precoTerra);
                    setClickerSeed(key);
                    setShowClickerSeedModal(false);
                    setShowClicker(true);
                    addTransaction('compra', `Comprou semente ${seed.nome} para clicker`, `-${seed.precoTerra} TERRA`);
                    saveGameInstant();
                  }}
                  disabled={terraToken < seed.precoTerra}
                  style={{
                    background: terraToken >= seed.precoTerra 
                      ? "linear-gradient(145deg, #10b981, #059669)" 
                      : "rgba(100,100,100,0.3)",
                    border: "none",
                    color: "#fff",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: terraToken >= seed.precoTerra ? "pointer" : "not-allowed"
                  }}
                >
                  JOGAR
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <button 
          onClick={() => setShowClickerSeedModal(false)}
          style={{ 
            marginTop: "20px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#94a3b8",
            padding: "12px",
            borderRadius: "12px",
            width: "100%",
            fontSize: "14px",
            cursor: "pointer"
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

  return (
    <div style={STYLES.container}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES_CSS }} />
      <div style={STYLES.bgGlow} />
      
      <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
        {aba === "fazenda" && renderFazenda()}
        {aba === "loja" && renderLoja()}
        {aba === "ranking" && renderRanking()}
        {aba === "perfil" && renderPerfil()}
        {aba === "banco" && renderBanco()}
        {aba === "lab" && renderLaboratorio()}
        {aba === "animais" && renderAnimais()}
      </div>

      {aba === "fazenda" && !showClicker && (
  <button
    onClick={() => setShowClickerSeedModal(true)}
    style={{
      position: "fixed",
      bottom: "100px",
      right: "20px",
      width: "64px",
      height: "64px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
      border: "3px solid rgba(255,255,255,0.2)",
      color: "#fff",
      fontSize: "28px",
      cursor: "pointer",
      boxShadow: "0 10px 40px rgba(139, 92, 246, 0.6), 0 0 20px rgba(236, 72, 153, 0.4)",
      zIndex: 90,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.3s ease",
      animation: "float 3s ease-in-out infinite"
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "scale(1.1)";
      e.currentTarget.style.boxShadow = "0 15px 50px rgba(139, 92, 246, 0.8), 0 0 30px rgba(236, 72, 153, 0.6)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "scale(1)";
      e.currentTarget.style.boxShadow = "0 10px 40px rgba(139, 92, 246, 0.6), 0 0 20px rgba(236, 72, 153, 0.4)";
    }}
    title="Minijogo Clicker"
  >
    🎮
  </button>
)}


      {/* Botão Flutuante do Histórico na Aba Perfil */}
      {aba === "perfil" && (
        <button
          onClick={() => setShowTransactionHistory(true)}
          style={{
            ...STYLES.floatingButton,
            bottom: "100px",
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            animation: "float 3s ease-in-out infinite"
          }}
          title="Histórico de Transações"
        >
          📜
        </button>
      )}

      {/* Navegação Inferior */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(15, 23, 42, 0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-around", padding: "12px 0", zIndex: 100 }}>
        {[
          { id: "fazenda", icon: "🌱", label: "Fazenda" },
          { id: "animais", icon: "🐄", label: "Animais" },
          { id: "loja", icon: "🛒", label: "Loja" },
          { id: "ranking", icon: "🏆", label: "Ranking" },
          { id: "perfil", icon: "👤", label: "Perfil" },
          { id: "banco", icon: "🏦", label: "Banco" },
          { id: "lab", icon: "⚛️", label: "Lab" },
        ].map(item => (
          <button key={item.id} onClick={() => setAba(item.id)} style={{ background: "transparent", border: "none", color: aba === item.id ? "#8b5cf6" : "#64748b", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer", transition: "all 0.2s ease", transform: aba === item.id ? "scale(1.1)" : "scale(1)" }}>
            <span style={{ fontSize: "24px" }}>{item.icon}</span>
            <span style={{ fontSize: "10px", fontWeight: "700" }}>{item.label}</span>
          </button>
        ))}
      </div>

      {selSlot !== null && renderPlantioModal()}
      {slotParaColeta && renderColetaModal()}
      {showDailyAd && renderDailyAdModal()}
      {showRoleta && renderRoletaModal()}
      {showClickerSeedModal && renderClickerSeedSelection()}
      {showClicker && renderClicker()}
      {showTransactionHistory && renderTransactionHistory()}

      {/* Notificações */}
      {notification && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: notification.type === 'success' ? "#10b981" : notification.type === 'error' ? "#ef4444" : "#3b82f6", color: "#fff", padding: "12px 24px", borderRadius: "12px", zIndex: 3000, boxShadow: "0 10px 30px rgba(0,0,0,0.3)", fontWeight: "700", animation: "bounce-in 0.4s ease" }}>{notification.message}</div>
      )}

      {/* Partículas Globais */}
      {particles.map(p => (
        <div key={p.id} style={{ position: "fixed", left: p.x, top: p.y, width: "6px", height: "6px", borderRadius: "50%", background: p.color, pointerEvents: "none", zIndex: 2500, animation: "float 1s ease-out forwards", opacity: 0.8 }} />
      ))}
    </div>
  );
}

export default function App() {
  return (
    <TonConnectUIProvider manifestUrl="https://galactic-farm.vercel.app/tonconnect-manifest.json">
      <GameComponent />
    </TonConnectUIProvider>
  );
}
