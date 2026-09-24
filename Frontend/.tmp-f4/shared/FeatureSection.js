"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureSection = FeatureSection;
const jsx_runtime_1 = require("react/jsx-runtime");
function FeatureSection({ config }) {
    return ((0, jsx_runtime_1.jsx)("section", { className: "rounded-2xl border border-slate-200 bg-white p-6", children: (0, jsx_runtime_1.jsx)("div", { className: "grid gap-4 md:grid-cols-3", children: config.features.map((feature) => ((0, jsx_runtime_1.jsxs)("article", { className: "rounded-xl border border-slate-200 bg-slate-50 p-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-2 text-2xl", children: feature.icon }), (0, jsx_runtime_1.jsx)("h4", { className: "text-lg font-semibold text-slate-900", children: feature.title }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-sm text-slate-600", children: feature.body })] }, feature.title))) }) }));
}
