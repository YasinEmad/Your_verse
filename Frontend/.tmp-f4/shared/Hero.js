"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hero = Hero;
const jsx_runtime_1 = require("react/jsx-runtime");
function Hero({ config }) {
    return ((0, jsx_runtime_1.jsx)("section", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm", children: (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500", children: "Feature" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-3xl font-bold text-slate-900", children: config.title }), config.subtitle ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-3 max-w-xl text-base text-slate-600", children: config.subtitle })) : null] }), (0, jsx_runtime_1.jsx)("img", { src: config.imageUrl, alt: config.title, className: "h-56 w-full rounded-xl object-cover" })] }) }));
}
