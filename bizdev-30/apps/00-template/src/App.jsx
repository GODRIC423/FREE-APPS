import { useState } from 'react';
import { Rocket, Check } from 'lucide-react';

export default function App() {
  const [n, setN] = useState(0);
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <Rocket className="mx-auto mb-3 h-8 w-8 text-amber-400" aria-hidden />
        <h1 className="text-2xl font-bold">Pipeline proof</h1>
        <button onClick={() => setN(n + 1)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          <Check className="h-4 w-4" aria-hidden /> Clicked {n}
        </button>
      </div>
    </main>
  );
}
