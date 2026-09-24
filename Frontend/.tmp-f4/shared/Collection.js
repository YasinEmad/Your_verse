"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collection = Collection;
const jsx_runtime_1 = require("react/jsx-runtime");
function Collection({ config }) {
    return ((0, jsx_runtime_1.jsxs)("section", { className: "rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-6", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs font-semibold uppercase tracking-[0.2em] text-slate-500", children: "Collection" }), (0, jsx_runtime_1.jsx)("h3", { className: "mt-2 text-2xl font-bold text-slate-900", children: config.collectionSlug })] }));
}
