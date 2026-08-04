import React from 'react';
import { MapExplorer } from '@/components/maps/MapExplorer';

export default function MapsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-7xl mx-auto">
      <MapExplorer />
    </div>
  );
}
