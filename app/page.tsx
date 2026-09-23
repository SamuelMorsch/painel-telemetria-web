"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AlertTriangle, Activity, Wrench } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [falhas, setFalhas] = useState<any[]>([]);

  useEffect(() => {
    const buscarHistorico = async () => {
      console.log("A tentar ligar ao Supabase...");
      const { data, error } = await supabase
        .from('falhas')
        .select('*')
        .order('data_registro', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error("Erro ao puxar dados do Supabase:", error.message);
        alert("Erro no Supabase: " + error.message); // Força um aviso no ecrã
      }
      
      if (data) {
        console.log("Dados recebidos:", data);
        setFalhas(data);
      }
    };

    buscarHistorico();

    const canalRealtime = supabase
      .channel('falhas-veiculo')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'falhas' },
        (payload) => {
          // Adiciona a nova falha no topo da lista
          setFalhas((atual) => [payload.new, ...atual].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalRealtime);
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-slate-200 font-sans">
      <header className="mb-8 border-b border-slate-700 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-sky-400 flex items-center gap-3">
            <Activity className="text-sky-400" />
            Painel da Oficina - Monitorização
          </h1>
          <p className="text-slate-400 mt-2">Receção de códigos de diagnóstico (DTC) em tempo real</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-medium text-emerald-400">Ligado à Nuvem</span>
        </div>
      </header>

      <section className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <Wrench className="text-amber-500" />
          <h2 className="text-xl font-semibold">Falhas Registadas</h2>
        </div>
        
        <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
          {falhas.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Aguardando dados do veículo...</p>
          ) : (
            falhas.map((falha) => (
              <div 
                key={falha.id} 
                className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors"
              >
                <div className="bg-red-500/20 text-red-400 font-bold px-3 py-1 rounded border border-red-500/30 flex-shrink-0 mt-1">
                  {falha.codigo}
                </div>
                <div className="flex-grow">
                  <p className="text-slate-200 font-medium">{falha.descricao}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Registado em: {new Date(falha.data_registro).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}