import React, { useState, useMemo } from 'react';
import { FileCode2, Search, ExternalLink } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import rawLicenses from '../../licenses.json';

interface LicenseItem {
  name: string;
  licenses: string;
  repository?: string;
  publisher?: string;
}

export const LicensesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const allLicenses = useMemo<LicenseItem[]>(() => {
    return Object.entries(rawLicenses as Record<string, any>).map(([key, value]) => ({
      name: key,
      licenses: value.licenses || 'Unknown',
      repository: value.repository,
      publisher: value.publisher,
    }));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return allLicenses;
    const s = search.toLowerCase();
    return allLicenses.filter(
      (l) =>
        l.name.toLowerCase().includes(s) ||
        l.licenses.toLowerCase().includes(s) ||
        (l.publisher && l.publisher.toLowerCase().includes(s))
    );
  }, [allLicenses, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  return (
    <>
      <Helmet>
        <title>Open Source Licenses — Raksha</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6 w-full">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-soft text-primary font-bold text-xs rounded-full">
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Open Source Compliance</span>
            </div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-text">
              Open Source Licenses &amp; Attributions
            </h1>
            <p className="text-xs text-text-muted">
              Raksha is powered by open source software. We gratefully acknowledge the authors and maintainers of the following {allLicenses.length} packages.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search library, license type (MIT, Apache, ISC)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-input-bg text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Results list */}
          <div className="bg-surface border border-border rounded-2xl shadow-xs divide-y divide-border overflow-hidden">
            {paginated.map((item) => (
              <div key={item.name} className="p-3.5 hover:bg-surface-raised transition-colors flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5 overflow-hidden">
                  <div className="font-mono font-semibold text-text truncate max-w-sm sm:max-w-md">
                    {item.name}
                  </div>
                  <div className="text-text-muted text-[11px] truncate">
                    {item.publisher ? `Publisher: ${item.publisher}` : 'Open source contributor'}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-raised border border-border text-primary font-semibold">
                    {item.licenses}
                  </span>
                  {item.repository && (
                    <a
                      href={item.repository}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-text-muted hover:text-text"
                      title="Source Code"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-text-muted pt-2">
              <div>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-raised disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-2 font-mono">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-raised disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
      </div>
    </>
  );
};
