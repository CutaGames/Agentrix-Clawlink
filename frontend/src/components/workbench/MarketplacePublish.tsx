import React from 'react';
import { ShoppingBag, Star, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Skill } from '../../types/skill.types';

export const MarketplacePublish: React.FC<{ selectedSkill?: Skill }> = ({ selectedSkill }) => {
  return (
    <div className="bg-slate-900 rounded-xl border border-white/10 overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShoppingBag className="text-orange-400" size={24} />
          Marketplace Publish
        </h2>
        <p className="text-xs text-slate-400">List your skills and set monetization policies</p>
      </div>

      <div className="p-6">
        {!selectedSkill ? (
          <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
            <ShoppingBag size={48} className="mx-auto mb-4 opacity-10" />
            <p className="text-slate-500">Select a skill from the registry to publish</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">
                  {selectedSkill.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-white">{selectedSkill.name}</h3>
                  <p className="text-xs text-slate-500">v{selectedSkill.version} • {selectedSkill.category}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                selectedSkill.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {selectedSkill.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Monetization Model</label>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-950 border border-blue-500/30 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DollarSign size={16} className="text-blue-400" />
                      <span className="text-sm text-white">Pay per Execution</span>
                    </div>
                    <input type="text" defaultValue="0.01" className="w-16 bg-transparent text-right text-blue-400 font-bold outline-none" />
                    <span className="text-xs text-slate-500">USDT</span>
                  </div>
                  <div className="p-3 bg-slate-950 border border-white/5 rounded-lg flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-3">
                      <Users size={16} className="text-slate-500" />
                      <span className="text-sm text-slate-300">Monthly Subscription</span>
                    </div>
                    <span className="text-xs text-slate-600">Coming soon</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Visibility & Access</label>
                <div className="p-4 bg-slate-950 border border-white/5 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Public in Marketplace</span>
                    <div className="w-10 h-5 bg-blue-600 rounded-full relative">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Allow White-labeling</span>
                    <div className="w-10 h-5 bg-slate-700 rounded-full relative">
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20">
              {selectedSkill.status === 'published' ? 'Update Marketplace Listing' : 'Confirm & Publish to Marketplace'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
